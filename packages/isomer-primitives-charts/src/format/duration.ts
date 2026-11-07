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

import { formatNumber, numberFormat, numberOptions } from './intl';

type DurationFormat = Extract<PortableFormat, { kind: 'duration' }>;

/** Milliseconds per unit. A month is 30 days and a year 365. */
const MILLISECONDS: Record<DurationUnit, number> = {
  picoseconds: 1e-9,
  nanoseconds: 1e-6,
  microseconds: 1e-3,
  milliseconds: 1,
  seconds: 1e3,
  minutes: 6e4,
  hours: 36e5,
  days: 864e5,
  weeks: 6048e5,
  months: 2592e6,
  years: 31536e6,
};

const LARGEST_FIRST: readonly DurationOutputUnit[] = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
  'microseconds',
  'nanoseconds',
];

const isOutputUnit = (unit: DurationUnit): unit is DurationOutputUnit =>
  (LARGEST_FIRST as readonly string[]).includes(unit);

/**
 * Formats a number of `format.input` units in `format.output`, or in the
 * largest unit it is at least one of, with `Intl.NumberFormat`'s unit names.
 * Zero stays in its input unit when that is one a duration displays in.
 */
export const formatDuration = (
  value: number,
  format: DurationFormat,
  locale: string
): string => {
  const { input, output = 'auto', unitDisplay = 'long' } = format;
  const inputScale = MILLISECONDS[input];
  const unit =
    output === 'auto'
      ? (LARGEST_FIRST.find(
          (candidate) => Math.abs(value) >= MILLISECONDS[candidate] / inputScale
        ) ?? (value === 0 && isOutputUnit(input) ? input : 'nanoseconds'))
      : output;
  return formatNumber(
    numberFormat(locale, {
      style: 'unit',
      // `Intl` names units in the singular: `hour`, not `hours`.
      unit: unit.slice(0, -1),
      unitDisplay,
      ...numberOptions(format),
    }),
    value * (inputScale / MILLISECONDS[unit])
  );
};
