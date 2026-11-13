/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DurationOutputUnit,
  DurationUnit,
  PortableFormat,
} from '../schema/format';

import {
  formatNumber,
  numberFormat,
  numberOptions,
  scaledUnitIndex,
} from './intl';

type DurationFormat = Extract<PortableFormat, { kind: 'duration' }>;

/** Picoseconds per unit, each an exact integer. A month is 30 days and a year 365. */
const PICOSECONDS: Record<DurationUnit, number> = {
  picoseconds: 1,
  nanoseconds: 1e3,
  microseconds: 1e6,
  milliseconds: 1e9,
  seconds: 1e12,
  minutes: 6e13,
  hours: 3.6e15,
  days: 8.64e16,
  weeks: 6.048e17,
  months: 2.592e18,
  years: 3.1536e19,
};

// `Intl` names units in the singular: `hour`, not `hours`.
const intlUnit = (unit: DurationOutputUnit) => unit.slice(0, -1);

// Older engines name no `microsecond` or `nanosecond`.
const NAMED_UNITS = new Set<string>(
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('unit')
    : []
);

const SMALLEST_FIRST: readonly DurationOutputUnit[] = (
  [
    'nanoseconds',
    'microseconds',
    'milliseconds',
    'seconds',
    'minutes',
    'hours',
    'days',
    'weeks',
    'months',
    'years',
  ] as const
).filter(
  (unit) =>
    NAMED_UNITS.has(intlUnit(unit)) ||
    (unit !== 'microseconds' && unit !== 'nanoseconds')
);

const isShown = (unit: DurationUnit): unit is DurationOutputUnit =>
  (SMALLEST_FIRST as readonly string[]).includes(unit);

const SIZES = SMALLEST_FIRST.map((unit) => PICOSECONDS[unit]);

/**
 * Formats a number of `format.input` units in `format.output`, or in the
 * largest unit it rounds to at least one of, with `Intl.NumberFormat`'s unit
 * names. Zero stays in its input unit when that is one a duration displays
 * in. A unit the environment cannot name falls back to milliseconds.
 */
export const formatDuration = (
  value: number,
  format: DurationFormat,
  locale: string
): string => {
  const { input, output = 'auto', unitDisplay = 'long' } = format;
  const unit =
    output === 'auto'
      ? value === 0 && isShown(input)
        ? input
        : SMALLEST_FIRST[
            scaledUnitIndex(Math.abs(value) * PICOSECONDS[input], SIZES, format)
          ]!
      : isShown(output)
        ? output
        : 'milliseconds';
  return formatNumber(
    numberFormat(locale, {
      style: 'unit',
      unit: intlUnit(unit),
      unitDisplay,
      ...numberOptions(format),
    }),
    value * (PICOSECONDS[input] / PICOSECONDS[unit])
  );
};
