/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's duration field format, with Moment's duration arithmetic and its
// English `humanize`, in plain JavaScript.

import type { DurationUnit } from '../schema/format';

export type DurationOutput =
  | 'humanize'
  | 'humanizePrecise'
  | Exclude<DurationUnit, 'picoseconds' | 'nanoseconds' | 'microseconds'>;

export interface DurationFormatOptions {
  input: DurationUnit;
  output: DurationOutput;
  /** Decimals for a unit output and `humanizePrecise`. Absent means 2. */
  decimals?: number | undefined;
  showSuffix?: boolean | undefined;
  useShortSuffix?: boolean | undefined;
  /** Absent means true. */
  includeSpaceWithSuffix?: boolean | undefined;
}

/** Seconds per input unit, as Kibana's duration format defines them. */
const SECONDS: Record<DurationUnit, number> = {
  picoseconds: 1e-12,
  nanoseconds: 1e-9,
  microseconds: 1e-6,
  milliseconds: 0.001,
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2592000,
  years: 31536000,
};

const UNIT_TEXT: Record<DurationOutput, { text: string; short?: string }> = {
  humanize: { text: 'Human-readable (approximate)' },
  humanizePrecise: { text: 'Human-readable (precise)' },
  milliseconds: { text: 'Milliseconds', short: 'ms' },
  seconds: { text: 'Seconds', short: 's' },
  minutes: { text: 'Minutes', short: 'min' },
  hours: { text: 'Hours', short: 'h' },
  days: { text: 'Days', short: 'd' },
  weeks: { text: 'Weeks', short: 'w' },
  months: { text: 'Months', short: 'mon' },
  years: { text: 'Years', short: 'y' },
};

/** A Moment duration's three stores: milliseconds, days and months. */
interface Duration {
  milliseconds: number;
  days: number;
  months: number;
}

// Kibana scales units below milliseconds to seconds, because Moment's
// constructors start at milliseconds.
const createDuration = (value: number, unit: DurationUnit): Duration => {
  switch (unit) {
    case 'picoseconds':
    case 'nanoseconds':
    case 'microseconds':
      return { milliseconds: value * SECONDS[unit] * 1e3, days: 0, months: 0 };
    case 'milliseconds':
      return { milliseconds: value, days: 0, months: 0 };
    case 'seconds':
      return { milliseconds: value * 1e3, days: 0, months: 0 };
    case 'minutes':
      return { milliseconds: value * 6e4, days: 0, months: 0 };
    case 'hours':
      return { milliseconds: value * 36e5, days: 0, months: 0 };
    case 'days':
      return { milliseconds: 0, days: value, months: 0 };
    case 'weeks':
      return { milliseconds: 0, days: value * 7, months: 0 };
    case 'months':
      return { milliseconds: 0, days: 0, months: value };
    case 'years':
      return { milliseconds: 0, days: 0, months: value * 12 };
  }
};

const daysToMonths = (days: number) => (days * 4800) / 146097;
const monthsToDays = (months: number) => (months * 146097) / 4800;

type AsUnit =
  | 'milliseconds'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'years';

/** Moment's `duration.as(unit)`. */
const as = ({ milliseconds, days, months }: Duration, unit: AsUnit): number => {
  if (unit === 'months' || unit === 'years') {
    const total = months + daysToMonths(days + milliseconds / 864e5);
    return unit === 'months' ? total : total / 12;
  }
  const whole = days + Math.round(monthsToDays(months));
  switch (unit) {
    case 'weeks':
      return whole / 7 + milliseconds / 6048e5;
    case 'days':
      return whole + milliseconds / 864e5;
    case 'hours':
      return whole * 24 + milliseconds / 36e5;
    case 'minutes':
      return whole * 1440 + milliseconds / 6e4;
    case 'seconds':
      return whole * 86400 + milliseconds / 1000;
    case 'milliseconds':
      return Math.floor(whole * 864e5) + milliseconds;
  }
};

/** Moment's English `duration.humanize()`, without a suffix. */
const humanize = (duration: Duration): string => {
  const abs: Duration = {
    milliseconds: Math.abs(duration.milliseconds),
    days: Math.abs(duration.days),
    months: Math.abs(duration.months),
  };
  const seconds = Math.round(as(abs, 'seconds'));
  const minutes = Math.round(as(abs, 'minutes'));
  const hours = Math.round(as(abs, 'hours'));
  const days = Math.round(as(abs, 'days'));
  const months = Math.round(as(abs, 'months'));
  const years = Math.round(as(abs, 'years'));
  // Moment's default thresholds: ss 44, s 45, m 45, h 22, d 26, M 11; weeks unused.
  if (seconds <= 44) {
    return 'a few seconds';
  }
  if (seconds < 45) {
    return `${seconds} seconds`;
  }
  if (minutes <= 1) {
    return 'a minute';
  }
  if (minutes < 45) {
    return `${minutes} minutes`;
  }
  if (hours <= 1) {
    return 'an hour';
  }
  if (hours < 22) {
    return `${hours} hours`;
  }
  if (days <= 1) {
    return 'a day';
  }
  if (days < 26) {
    return `${days} days`;
  }
  if (months <= 1) {
    return 'a month';
  }
  if (months < 11) {
    return `${months} months`;
  }
  if (years <= 1) {
    return 'a year';
  }
  return `${years} years`;
};

// Kibana counts a month as 30 days when it picks the unit to show.
const PRECISE_UNITS: { seconds: number; unit: DurationOutput }[] = [
  { seconds: 31536000, unit: 'years' },
  { seconds: 2592000, unit: 'months' },
  { seconds: 604800, unit: 'weeks' },
  { seconds: 86400, unit: 'days' },
  { seconds: 3600, unit: 'hours' },
  { seconds: 60, unit: 'minutes' },
  { seconds: 1, unit: 'seconds' },
  { seconds: 0.001, unit: 'milliseconds' },
];

const unitText = (unit: DurationOutput, short: boolean) => {
  const { text, short: shortText } = UNIT_TEXT[unit];
  return short ? shortText : text.toLowerCase();
};

/**
 * Formats a number as Kibana's duration field format does, in English.
 * `value` is in `options.input` units.
 */
export const formatDuration = (
  value: number,
  {
    input,
    output,
    decimals = 2,
    showSuffix = false,
    useShortSuffix = false,
    includeSpaceWithSuffix = true,
  }: DurationFormatOptions
): string => {
  const space = includeSpaceWithSuffix ? ' ' : '';
  if (output === 'humanize' && value === 0) {
    return '0 seconds';
  }
  const duration = createDuration(value, input);
  if (output === 'humanizePrecise') {
    const signed = as(duration, 'seconds');
    const magnitude = Math.abs(signed);
    const sign = signed < 0 ? '-' : '';
    const { unit, seconds } =
      PRECISE_UNITS.find(
        (candidate, index) =>
          magnitude / candidate.seconds >= 1 ||
          index === PRECISE_UNITS.length - 1
      ) ?? PRECISE_UNITS[PRECISE_UNITS.length - 1]!;
    return `${sign}${(magnitude / seconds).toFixed(decimals)}${space}${unitText(unit, useShortSuffix) ?? ''}`;
  }
  if (output === 'humanize') {
    return `${value < 0 ? 'minus ' : ''}${humanize(duration)}`;
  }
  const text = unitText(output, useShortSuffix);
  const suffix = showSuffix && text ? `${space}${text}` : '';
  return `${as(duration, output).toFixed(decimals)}${suffix}`;
};
