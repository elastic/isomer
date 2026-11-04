/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Moment.js format patterns, as Kibana's date field format takes them, in
// plain JavaScript with Moment's English locale. Wall-clock fields come from
// `zone.ts`; names, ordinals, weeks and padding are computed here.

import { type WallClock, wallClock, zoneAbbreviation } from './zone';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Moment's English long date formats. */
const LONG_FORMATS: Record<string, string> = {
  LTS: 'h:mm:ss A',
  LT: 'h:mm A',
  L: 'MM/DD/YYYY',
  LL: 'MMMM D, YYYY',
  LLL: 'MMMM D, YYYY h:mm A',
  LLLL: 'dddd, MMMM D, YYYY h:mm A',
  l: 'M/D/YYYY',
  ll: 'MMM D, YYYY',
  lll: 'MMM D, YYYY h:mm A',
  llll: 'ddd, MMM D, YYYY h:mm A',
};

// Moment's own token expressions.
const LONG_TOKENS = /(\[[^[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;
const TOKENS =
  /(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

const zeroFill = (value: number, length: number, forceSign = false): string => {
  const digits = String(Math.abs(value));
  const sign = value >= 0 ? (forceSign ? '+' : '') : '-';
  return sign + digits.padStart(length, '0');
};

/** Moment's English ordinal suffix. */
export const ordinal = (value: number): string => {
  const last = value % 10;
  const suffix =
    Math.trunc((value % 100) / 10) === 1
      ? 'th'
      : last === 1
        ? 'st'
        : last === 2
          ? 'nd'
          : last === 3
            ? 'rd'
            : 'th';
  return `${value}${suffix}`;
};

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInYear = (year: number) => (isLeapYear(year) ? 366 : 365);

const dayOfYear = ({ year, month, day }: WallClock) =>
  Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 864e5) +
  1;

// Week numbering as Moment computes it, for a locale's first day of week
// (`dow`) and the day of January that is always in week 1 (`doy`).
const firstWeekOffset = (year: number, dow: number, doy: number) => {
  const firstWeekDay = 7 + dow - doy;
  const weekday = new Date(Date.UTC(year, 0, firstWeekDay)).getUTCDay();
  return -((7 + weekday - dow) % 7) + firstWeekDay - 1;
};

const weeksInYear = (year: number, dow: number, doy: number) =>
  (daysInYear(year) -
    firstWeekOffset(year, dow, doy) +
    firstWeekOffset(year + 1, dow, doy)) /
  7;

const weekOfYear = (clock: WallClock, dow: number, doy: number) => {
  const week =
    Math.floor(
      (dayOfYear(clock) - firstWeekOffset(clock.year, dow, doy) - 1) / 7
    ) + 1;
  if (week < 1) {
    const year = clock.year - 1;
    return { week: week + weeksInYear(year, dow, doy), year };
  }
  const weeks = weeksInYear(clock.year, dow, doy);
  return week > weeks
    ? { week: week - weeks, year: clock.year + 1 }
    : { week, year: clock.year };
};

// English: weeks start on Sunday and week 1 holds January 1. ISO: Monday, January 4.
const LOCALE_WEEK = [0, 6] as const;
const ISO_WEEK = [1, 4] as const;

const offsetString = (offset: number, separator: string) => {
  const minutes = Math.abs(offset);
  return `${offset < 0 ? '-' : '+'}${zeroFill(Math.floor(minutes / 60), 2)}${separator}${zeroFill(minutes % 60, 2)}`;
};

const formatYear = (year: number) =>
  year <= 9999 ? zeroFill(year, 4) : `+${year}`;

type TokenFormatter = (
  clock: WallClock,
  epoch: number,
  timeZone: string
) => string;

const fractional =
  (digits: number): TokenFormatter =>
  (clock) =>
    zeroFill(Math.floor(clock.millisecond * 10 ** (digits - 3)), digits);

const h12 = (clock: WallClock) => clock.hour % 12 || 12;

const FORMATTERS: Record<string, TokenFormatter> = {
  M: (c) => String(c.month),
  Mo: (c) => ordinal(c.month),
  MM: (c) => zeroFill(c.month, 2),
  MMM: (c) => MONTHS[c.month - 1]!.slice(0, 3),
  MMMM: (c) => MONTHS[c.month - 1]!,
  Q: (c) => String(Math.ceil(c.month / 3)),
  Qo: (c) => ordinal(Math.ceil(c.month / 3)),
  D: (c) => String(c.day),
  Do: (c) => ordinal(c.day),
  DD: (c) => zeroFill(c.day, 2),
  DDD: (c) => String(dayOfYear(c)),
  DDDo: (c) => ordinal(dayOfYear(c)),
  DDDD: (c) => zeroFill(dayOfYear(c), 3),
  d: (c) => String(c.weekday),
  do: (c) => ordinal(c.weekday),
  dd: (c) => WEEKDAYS[c.weekday]!.slice(0, 2),
  ddd: (c) => WEEKDAYS[c.weekday]!.slice(0, 3),
  dddd: (c) => WEEKDAYS[c.weekday]!,
  e: (c) => String((c.weekday + 7 - LOCALE_WEEK[0]) % 7),
  E: (c) => String(c.weekday || 7),
  w: (c) => String(weekOfYear(c, ...LOCALE_WEEK).week),
  wo: (c) => ordinal(weekOfYear(c, ...LOCALE_WEEK).week),
  ww: (c) => zeroFill(weekOfYear(c, ...LOCALE_WEEK).week, 2),
  W: (c) => String(weekOfYear(c, ...ISO_WEEK).week),
  Wo: (c) => ordinal(weekOfYear(c, ...ISO_WEEK).week),
  WW: (c) => zeroFill(weekOfYear(c, ...ISO_WEEK).week, 2),
  Y: (c) => (c.year <= 9999 ? String(c.year) : `+${c.year}`),
  YY: (c) => zeroFill(c.year % 100, 2),
  YYYY: (c) => formatYear(c.year),
  YYYYY: (c) => zeroFill(c.year, 5),
  YYYYYY: (c) => zeroFill(c.year, 6, true),
  y: (c) => String(c.year),
  yo: (c) => ordinal(c.year),
  yy: (c) => zeroFill(c.year % 100, 2),
  yyy: (c) => zeroFill(c.year, 3),
  yyyy: (c) => zeroFill(c.year, 4),
  N: () => 'AD',
  NN: () => 'AD',
  NNN: () => 'AD',
  NNNN: () => 'Anno Domini',
  NNNNN: () => 'AD',
  gg: (c) => zeroFill(weekOfYear(c, ...LOCALE_WEEK).year % 100, 2),
  gggg: (c) => zeroFill(weekOfYear(c, ...LOCALE_WEEK).year, 4),
  ggggg: (c) => zeroFill(weekOfYear(c, ...LOCALE_WEEK).year, 5),
  GG: (c) => zeroFill(weekOfYear(c, ...ISO_WEEK).year % 100, 2),
  GGGG: (c) => zeroFill(weekOfYear(c, ...ISO_WEEK).year, 4),
  GGGGG: (c) => zeroFill(weekOfYear(c, ...ISO_WEEK).year, 5),
  a: (c) => (c.hour < 12 ? 'am' : 'pm'),
  A: (c) => (c.hour < 12 ? 'AM' : 'PM'),
  H: (c) => String(c.hour),
  HH: (c) => zeroFill(c.hour, 2),
  h: (c) => String(h12(c)),
  hh: (c) => zeroFill(h12(c), 2),
  k: (c) => String(c.hour || 24),
  kk: (c) => zeroFill(c.hour || 24, 2),
  hmm: (c) => `${h12(c)}${zeroFill(c.minute, 2)}`,
  hmmss: (c) => `${h12(c)}${zeroFill(c.minute, 2)}${zeroFill(c.second, 2)}`,
  Hmm: (c) => `${c.hour}${zeroFill(c.minute, 2)}`,
  Hmmss: (c) => `${c.hour}${zeroFill(c.minute, 2)}${zeroFill(c.second, 2)}`,
  m: (c) => String(c.minute),
  mm: (c) => zeroFill(c.minute, 2),
  s: (c) => String(c.second),
  ss: (c) => zeroFill(c.second, 2),
  S: (c) => String(Math.floor(c.millisecond / 100)),
  SS: (c) => zeroFill(Math.floor(c.millisecond / 10), 2),
  SSS: (c) => zeroFill(c.millisecond, 3),
  SSSS: fractional(4),
  SSSSS: fractional(5),
  SSSSSS: fractional(6),
  SSSSSSS: fractional(7),
  SSSSSSSS: fractional(8),
  SSSSSSSSS: fractional(9),
  Z: (c) => offsetString(c.offset, ':'),
  ZZ: (c) => offsetString(c.offset, ''),
  X: (_, epoch) => String(Math.floor(epoch / 1000)),
  x: (_, epoch) => String(epoch),
  z: (_, epoch, timeZone) => zoneAbbreviation(epoch, timeZone),
  zz: (_, epoch, timeZone) => zoneAbbreviation(epoch, timeZone),
};

const expandLongFormats = (pattern: string): string => {
  let expanded = pattern;
  // Moment expands nested long formats up to five levels deep.
  for (let depth = 0; depth < 5; depth += 1) {
    const next = expanded.replace(
      LONG_TOKENS,
      (match: string) => LONG_FORMATS[match] ?? match
    );
    if (next === expanded) {
      break;
    }
    expanded = next;
  }
  return expanded;
};

type Part = string | TokenFormatter;

const compiled = new Map<string, Part[]>();

const compile = (pattern: string): Part[] => {
  const cached = compiled.get(pattern);
  if (cached) {
    return cached;
  }
  const parts = (expandLongFormats(pattern).match(TOKENS) ?? []).map(
    (token): Part => {
      const formatter = FORMATTERS[token];
      if (formatter) {
        return formatter;
      }
      if (/^\[[\s\S]*\]$/.test(token)) {
        return token.slice(1, -1);
      }
      return token.replace(/\\/g, '');
    }
  );
  compiled.set(pattern, parts);
  return parts;
};

/**
 * Formats an instant with a Moment.js pattern in an IANA time zone, as Kibana's
 * date field format does, in English. `epoch` is milliseconds since the epoch.
 */
export const formatDate = (
  epoch: number,
  pattern: string,
  timeZone: string
): string => {
  const clock = wallClock(epoch, timeZone);
  return compile(pattern)
    .map((part) =>
      typeof part === 'string' ? part : part(clock, epoch, timeZone)
    )
    .join('');
};

/**
 * A date cell as epoch milliseconds: a number as it is, or an ISO 8601 string
 * parsed. `undefined` when it is neither.
 */
export const toEpoch = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};
