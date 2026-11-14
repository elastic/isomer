/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { afterTask } from '../after_task';

// Cached `Intl` formatters. Constructing one is far slower than using it.

/** How many formatters of each kind are kept between tasks. Options come from nodes, so the caches are bounded. */
export const INTL_CACHE_SIZE = 64;

// Keeps the `INTL_CACHE_SIZE` most recently used values, and every value the
// current task has used, so one resolution with more formats than that builds
// each formatter once.
const createCache = <T>() => {
  const values = new Map<string, T>();
  let task: Map<string, T> | undefined;
  const recent = (key: string, create: () => T): T => {
    let value = values.get(key);
    if (value === undefined) {
      value = create();
      if (values.size >= INTL_CACHE_SIZE) {
        values.delete(values.keys().next().value!);
      }
    } else {
      values.delete(key);
    }
    values.set(key, value);
    return value;
  };
  return (key: string, create: () => T): T => {
    if (!task) {
      task = new Map();
      afterTask(() => {
        task = undefined;
      });
    }
    let value = task.get(key);
    if (value === undefined) {
      value = recent(key, create);
      task.set(key, value);
    }
    return value;
  };
};

const numberFormats = createCache<Intl.NumberFormat>();
const dateFormats = createCache<Intl.DateTimeFormat>();
const collators = createCache<Intl.Collator>();

// `locale` when well-formed, else `en`. The constructors also fall back to `en` for a well-formed tag the environment lacks.
const localesOf = (locale: string): string[] => {
  try {
    return [Intl.getCanonicalLocales(locale)[0] ?? 'en', 'en'];
  } catch {
    return ['en'];
  }
};

/** A cached `Intl.NumberFormat`, falling back to `en` rather than the host default. */
export const numberFormat = (
  locale: string,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat =>
  numberFormats(
    `${locale}|${JSON.stringify(options)}`,
    () => new Intl.NumberFormat(localesOf(locale), options)
  );

/** A cached `Intl.DateTimeFormat`, falling back to `en` rather than the host default. Throws a `RangeError` for a time zone the environment does not know. */
export const dateFormat = (
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat =>
  dateFormats(
    `${locale}|${JSON.stringify(options)}`,
    () => new Intl.DateTimeFormat(localesOf(locale), options)
  );

/** A cached `Intl.Collator`, falling back to `en` rather than the host default. */
export const collator = (locale: string): Intl.Collator =>
  collators(locale, () => new Intl.Collator(localesOf(locale)));

/** `value` formatted, printing a negative value that rounds to zero as zero, not `-0`, unless the sign display is `always`. */
export const formatNumber = (
  formatter: Intl.NumberFormat,
  value: number
): string =>
  value < 0 || Object.is(value, -0)
    ? formatter.resolvedOptions().signDisplay !== 'always' &&
      formatter.format(-value) === formatter.format(0)
      ? formatter.format(0)
      : formatter.format(value)
    : formatter.format(value);

interface NumberFields {
  minimumFractionDigits?: number | undefined;
  maximumFractionDigits?: number | undefined;
  signDisplay?: Intl.NumberFormatOptions['signDisplay'] | undefined;
  useGrouping?: boolean | undefined;
}

/** The `Intl.NumberFormat` options a format states, without the ones it leaves absent. */
export const numberOptions = ({
  minimumFractionDigits,
  maximumFractionDigits,
  signDisplay,
  useGrouping,
}: NumberFields): Intl.NumberFormatOptions => ({
  ...(minimumFractionDigits === undefined ? {} : { minimumFractionDigits }),
  // `Intl` throws when the maximum is below the minimum.
  ...(maximumFractionDigits === undefined
    ? {}
    : {
        maximumFractionDigits: Math.max(
          maximumFractionDigits,
          minimumFractionDigits ?? 0
        ),
      }),
  ...(signDisplay === undefined ? {} : { signDisplay }),
  ...(useGrouping === undefined ? {} : { useGrouping }),
});

/**
 * The index in ascending `sizes` of the largest unit that `magnitude`, rounded
 * to the format's fraction digits, is at least one of; `0` below them all.
 */
export const scaledUnitIndex = (
  magnitude: number,
  sizes: readonly number[],
  { minimumFractionDigits, maximumFractionDigits }: NumberFields
): number => {
  let index = sizes.length - 1;
  while (index > 0 && magnitude < sizes[index]!) {
    index--;
  }
  const size = sizes[index]!;
  const next = sizes[index + 1];
  if (next === undefined) {
    return index;
  }
  const rounded = Number(
    numberFormat('en', {
      useGrouping: false,
      ...numberOptions({ minimumFractionDigits, maximumFractionDigits }),
    }).format(magnitude / size)
  );
  return rounded >= next / size ? index + 1 : index;
};
