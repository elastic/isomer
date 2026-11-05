/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Cached `Intl` formatters. Constructing one is far slower than using it.

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** `locale` when the environment accepts it as a BCP 47 tag, else `en`. */
export const supportedLocale = (locale: string): string => {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? 'en';
  } catch {
    return 'en';
  }
};

export const numberFormat = (
  locale: string,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(supportedLocale(locale), options);
    numberFormats.set(key, format);
  }
  return format;
};

/** Throws a `RangeError` for a time zone the environment does not know. */
export const dateFormat = (
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(supportedLocale(locale), options);
    dateFormats.set(key, format);
  }
  return format;
};

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
