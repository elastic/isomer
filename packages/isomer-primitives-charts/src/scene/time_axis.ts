/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The multi-layer time axis Lens draws, decided here rather than by an engine.
// A port of Elastic Charts' `continuousTimeRasters` and `multilayerAxisEntry`
// (`chart_types/xy_chart/axes/timeslip/`, 73.3): the same rasters, thresholds,
// replacements, filters and `Intl` labels, with Luxon's zoned arithmetic done
// through `Intl.DateTimeFormat` so the resolver needs no date library.

import { dateFormat } from '../format/intl';

import type { SceneTimeBand, SceneTimeLayer, SceneTimeTicks } from './types';

/** Elastic Charts' `MINIMUM_TICK_PIXEL_DISTANCE`. */
const MINIMUM_TICK_PIXEL_DISTANCE = 24;
/** Elastic Charts' `MAX_TIME_TICK_COUNT`. */
const MAX_TIME_TICK_COUNT = 50;
/** Elastic Charts' `MAX_TIME_GRID_COUNT`. */
const MAX_TIME_GRID_COUNT = 12;
/** Elastic Charts' `WIDTH_FUDGE`. */
const WIDTH_FUDGE = 1.05;
/** Elastic Charts' default `timeAxisLayerCount`, which Lens keeps. */
const LAYER_COUNT = 2;
/** Elastic Charts' default `dow`, which Lens keeps: weeks start on Monday. */
const START_DAY_OF_WEEK = 1;

type TimeUnit =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';

/** Seconds per unit, as Elastic Charts' `unitIntervalWidth` states them. */
const UNIT_SECONDS: Record<TimeUnit, number> = {
  year: 365.25 * 24 * 60 * 60,
  month: (365.25 * 24 * 60 * 60) / 12,
  week: 7 * 24 * 60 * 60,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 1,
  millisecond: 0.001,
};

/** One raster bin, in epoch seconds. */
interface Bin {
  readonly minimum: number;
  supremum: number;
  readonly labelSupremum: number;
  readonly year?: number;
  readonly month?: number;
  readonly days?: number;
  readonly dayOfMonth?: number;
}

interface Raster {
  readonly unit: TimeUnit;
  readonly unitMultiplier: number;
  readonly labeled: boolean;
  readonly minimumTickPixelDistance: number;
  readonly intervals: (from: number, to: number) => Iterable<Bin>;
  readonly detailedLabelFormat: (ms: number) => string;
  readonly minorTickLabelFormat: (ms: number) => string;
}

// --- Zoned calendar arithmetic, as Luxon's `IANAZone` and `DateTime` do it. ---

interface Calendar {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

const DAY_MS = 86_400_000;

const isLeap = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  const m = ((((month - 1) % 12) + 12) % 12) + 1;
  const y = year + Math.floor((month - 1) / 12);
  return m === 2 ? (isLeap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
};

/** Luxon's `objToLocalTS`: a wall-clock time as if it were UTC. */
const localTs = (c: Calendar): number => {
  const date = new Date(
    Date.UTC(
      c.year,
      c.month - 1,
      c.day,
      c.hour,
      c.minute,
      c.second,
      c.millisecond
    )
  );
  if (c.year < 100 && c.year >= 0) {
    date.setUTCFullYear(c.year, c.month - 1, c.day);
  }
  return date.getTime();
};

const toCalendar = (ts: number): Calendar => {
  const date = new Date(ts);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
};

/** A zone's wall clock and offsets, cached for one resolution. */
interface Zone {
  /** The zone's UTC offset at `ts`, in minutes, as Luxon's `IANAZone.offset` computes it. */
  readonly offset: (ts: number) => number;
}

const createZone = (timeZone: string): Zone => {
  const format = dateFormat('en-US', {
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    era: 'short',
    timeZone,
  });
  const offsets = new Map<number, number>();
  return {
    offset: (ts) => {
      if (!Number.isFinite(ts)) {
        return NaN;
      }
      let asTs = ts;
      const over = asTs % 1000;
      asTs -= over >= 0 ? over : 1000 + over;
      const known = offsets.get(asTs);
      if (known !== undefined) {
        return known;
      }
      const parts: Record<string, string> = {};
      for (const { type, value } of format.formatToParts(new Date(ts))) {
        parts[type] = value;
      }
      let year = Number(parts.year);
      if (parts.era === 'BC' || parts.era === 'B') {
        year = -Math.abs(year) + 1;
      }
      const hour = Number(parts.hour);
      const asUtc = localTs({
        year,
        month: Number(parts.month),
        day: Number(parts.day),
        hour: hour === 24 ? 0 : hour,
        minute: Number(parts.minute),
        second: Number(parts.second),
        millisecond: 0,
      });
      const offset = (asUtc - asTs) / 60_000;
      offsets.set(asTs, offset);
      return offset;
    },
  };
};

/** Luxon's `fixOffset`: the instant of a wall-clock time, from a provisional offset. */
const fixOffset = (
  local: number,
  provisional: number,
  zone: Zone
): { ts: number; offset: number } => {
  let utcGuess = local - provisional * 60_000;
  const o2 = zone.offset(utcGuess);
  if (provisional === o2) {
    return { ts: utcGuess, offset: provisional };
  }
  utcGuess -= (o2 - provisional) * 60_000;
  const o3 = zone.offset(utcGuess);
  if (o2 === o3) {
    return { ts: utcGuess, offset: o2 };
  }
  return {
    ts: local - Math.min(o2, o3) * 60_000,
    offset: Math.max(o2, o3),
  };
};

/** A zoned instant: its epoch milliseconds and its offset, as a Luxon `DateTime` holds them. */
interface Zoned {
  readonly ts: number;
  readonly offset: number;
}

/**
 * Luxon's `DateTime.fromObject({ year, month, day, hour }, { zone })`: NaN for a
 * day the month lacks; a time in a gap moves forward. Luxon starts from the
 * offset now; this starts from the offset at the wall-clock time read as UTC,
 * so a time a zone repeats resolves the same whenever it runs.
 */
const fromCalendar = (
  zone: Zone,
  year: number,
  month: number,
  day: number,
  hour = 0
): Zoned => {
  if (day < 1 || day > daysInMonth(year, month)) {
    return { ts: NaN, offset: NaN };
  }
  const local = localTs({
    year,
    month,
    day,
    hour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return fixOffset(local, zone.offset(local), zone);
};

/** Luxon's `plus({ days })`: the same wall-clock time `days` later. */
const plusDays = (zone: Zone, { ts, offset }: Zoned, days: number): number => {
  if (!Number.isFinite(ts)) {
    return NaN;
  }
  const c = toCalendar(ts + offset * 60_000);
  return fixOffset(localTs({ ...c, day: c.day + days }), offset, zone).ts;
};

const calendarAt = (zone: Zone, seconds: number): Calendar => {
  const ts = seconds * 1000;
  return toCalendar(ts + zone.offset(ts) * 60_000);
};

/** Luxon's ISO weekday, 1 for Monday. */
const weekdayOf = ({ ts, offset }: Zoned): number =>
  Number.isFinite(ts)
    ? ((Math.floor((ts + offset * 60_000) / DAY_MS) + 3) % 7) + 1
    : NaN;

// --- Rasters, as `continuousTimeRasters` builds them. ---

const ENGLISH_ORDINALS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

const HOUR_FORMAT = {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
} as const;

const millisecondIntervals = (rasterMs: number) =>
  function* (from: number, to: number): Iterable<Bin> {
    for (
      let t = Math.floor((from * 1000) / rasterMs);
      t < Math.ceil((to * 1000) / rasterMs);
      t++
    ) {
      const minimum = (t * rasterMs) / 1000;
      const supremum = minimum + rasterMs / 1000;
      yield { minimum, supremum, labelSupremum: supremum };
    }
  };

/** Every raster finest last, and the replacements a finer one makes, as Elastic Charts lists them. */
const createRasters = (locale: string, timeZone: string) => {
  const zone = createZone(timeZone);
  const format =
    (options: Intl.DateTimeFormatOptions) =>
    (ms: number): string =>
      dateFormat(locale, { ...options, timeZone }).format(ms);
  const zonedCache = new Map<string, Zoned>();
  const zoned = (year: number, month: number, day: number, hour = 0) => {
    const key = `${year}_${month}_${day}_${hour}`;
    let value = zonedCache.get(key);
    if (value === undefined) {
      value = fromCalendar(zone, year, month, day, hour);
      zonedCache.set(key, value);
    }
    return value;
  };
  const seconds = ({ ts }: Zoned) => ts / 1000;
  const dayAfter = (year: number, month: number, day: number, count: number) =>
    plusDays(zone, zoned(year, month, day), count) / 1000;
  const yearAt = (s: number) => calendarAt(zone, s).year;

  const minorDayBase = format({ day: 'numeric' });
  let englishOrdinals: Intl.PluralRules | undefined;
  const minorDayFormat = (ms: number) => {
    const text = minorDayBase(ms);
    if (locale.substring(0, 2) !== 'en') {
      return text;
    }
    englishOrdinals ??= new Intl.PluralRules('en-US', { type: 'ordinal' });
    return `${text}${ENGLISH_ORDINALS[englishOrdinals.select(Number.parseInt(text, 10))]}`;
  };
  const detailedDayFormat = format({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const detailedHourBase = format({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...HOUR_FORMAT,
  });
  const detailedHourFormat = (ms: number) => `${detailedHourBase(ms)}h`;
  const m = MINIMUM_TICK_PIXEL_DISTANCE;
  const unlabeledDistance = m / 1.618;
  const yearFormat = format({ year: 'numeric' });

  const years: Raster = {
    unit: 'year',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: m * 1.5,
    *intervals(from, to) {
      for (let year = yearAt(from); year <= yearAt(to); year++) {
        const supremum = seconds(zoned(year + 1, 1, 1));
        yield {
          year,
          minimum: seconds(zoned(year, 1, 1)),
          supremum,
          labelSupremum: supremum,
        };
      }
    },
    detailedLabelFormat: yearFormat,
    minorTickLabelFormat: yearFormat,
  };
  const yearsUnlabelled = {
    ...years,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const decades: Raster = {
    ...years,
    unitMultiplier: 10,
    *intervals(from, to) {
      const last = Math.ceil(yearAt(to) / 10) * 10;
      for (
        let year = Math.floor(yearAt(from) / 10) * 10;
        year <= last;
        year += 10
      ) {
        const supremum = seconds(zoned(year + 10, 1, 1));
        yield {
          year,
          minimum: seconds(zoned(year, 1, 1)),
          supremum,
          labelSupremum: supremum,
        };
      }
    },
  };
  const decadesUnlabelled = {
    ...decades,
    labeled: false,
    minimumTickPixelDistance: 1,
  };
  const monthIntervals = (multiplier: number) =>
    function* (from: number, to: number): Iterable<Bin> {
      for (const { year } of years.intervals(from, to)) {
        for (let month = 1; month <= 12; month += multiplier) {
          const start = zoned(year!, month, 1);
          const supremum = seconds(
            zoned(
              month <= 12 - multiplier ? year! : year! + 1,
              ((month + multiplier - 1) % 12) + 1,
              1
            )
          );
          yield {
            year: year!,
            month,
            days: calendarDaysInMonth(start),
            minimum: seconds(start),
            supremum,
            labelSupremum: supremum,
          };
        }
      }
    };
  const calendarDaysInMonth = ({ ts, offset }: Zoned) => {
    const c = toCalendar(ts + offset * 60_000);
    return daysInMonth(c.year, c.month);
  };
  const months: Raster = {
    unit: 'month',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: m * 3.6,
    intervals: monthIntervals(1),
    detailedLabelFormat: format({ year: 'numeric', month: 'long' }),
    minorTickLabelFormat: format({ month: 'long' }),
  };
  const shortMonths: Raster = {
    ...months,
    minorTickLabelFormat: format({ month: 'short' }),
    minimumTickPixelDistance: m * 2,
  };
  const quarters: Raster = {
    ...shortMonths,
    unitMultiplier: 3,
    intervals: monthIntervals(3),
  };
  const quartersUnlabelled = {
    ...quarters,
    minimumTickPixelDistance: unlabeledDistance,
    labeled: false,
  };
  const days: Raster = {
    unit: 'day',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: m * 1.5,
    *intervals(from, to) {
      for (const { year, month } of months.intervals(from, to)) {
        for (let day = 1; day <= 31; day++) {
          const start = seconds(zoned(year!, month!, day));
          const supremum = dayAfter(year!, month!, day, 1);
          if (Number.isFinite(start) && Number.isFinite(supremum)) {
            yield {
              year: year!,
              month: month!,
              dayOfMonth: day,
              minimum: start,
              supremum,
              labelSupremum: supremum,
            };
          }
        }
      }
    },
    detailedLabelFormat: detailedDayFormat,
    minorTickLabelFormat: minorDayFormat,
  };
  const weekStartDays: Raster = {
    unit: 'week',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: m * 1.5,
    *intervals(from, to) {
      for (const { year, month, days: monthDays } of months.intervals(
        from,
        to
      )) {
        for (let day = 1; day <= 31; day++) {
          const point = zoned(year!, month!, day);
          if (weekdayOf(point) !== START_DAY_OF_WEEK) {
            continue;
          }
          const start = seconds(point);
          if (Number.isFinite(start)) {
            const daysFromEnd = monthDays! - day + 1;
            const supremum = dayAfter(year!, month!, day, 7);
            yield {
              dayOfMonth: day,
              minimum: start,
              supremum,
              labelSupremum:
                daysFromEnd < 7
                  ? dayAfter(year!, month!, day, daysFromEnd)
                  : supremum,
            };
          }
        }
      }
    },
    minorTickLabelFormat: minorDayFormat,
    detailedLabelFormat: detailedDayFormat,
  };
  const daysUnlabelled = {
    ...days,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const weeksUnlabelled = {
    ...weekStartDays,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const monthsUnlabelled = {
    ...months,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const hhMm = 1.8;
  const hhMmSs = 2.5;
  const hourMinute = format(HOUR_FORMAT);
  const hours: Raster = {
    unit: 'hour',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: hhMm * m,
    intervals: millisecondIntervals(60 * 60 * 1000),
    detailedLabelFormat: detailedHourFormat,
    minorTickLabelFormat: hourMinute,
  };
  const hoursUnlabelled = {
    ...hours,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const sixHours: Raster = {
    unit: 'hour',
    unitMultiplier: 6,
    labeled: true,
    minimumTickPixelDistance: 2 * m,
    intervals: (from, to) => {
      const bins: Bin[] = [...days.intervals(from, to)].flatMap(
        ({ year, month, dayOfMonth }) =>
          [0, 6, 12, 18].flatMap((hour): Bin[] => {
            const start = seconds(zoned(year!, month!, dayOfMonth!, hour));
            const supremum = start + 6 * 60 * 60;
            return Number.isNaN(start)
              ? []
              : [{ minimum: start, supremum, labelSupremum: supremum }];
          })
      );
      bins.forEach((bin, index) => {
        const next = bins[index + 1];
        if (next) {
          bin.supremum = next.minimum;
        }
      });
      return bins;
    },
    minorTickLabelFormat: hourMinute,
    detailedLabelFormat: detailedHourFormat,
  };
  const sixHoursUnlabelled = {
    ...sixHours,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const minutes: Raster = {
    unit: 'minute',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: hhMm * m,
    intervals: millisecondIntervals(60 * 1000),
    detailedLabelFormat: format({
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...HOUR_FORMAT,
      minute: 'numeric',
    }),
    minorTickLabelFormat: format({ ...HOUR_FORMAT }),
  };
  const quarterHours = {
    ...minutes,
    unitMultiplier: 15,
    intervals: millisecondIntervals(15 * 60 * 1000),
  };
  const quarterHoursUnlabelled = {
    ...quarterHours,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const fiveMinutes = {
    ...minutes,
    unitMultiplier: 5,
    intervals: millisecondIntervals(5 * 60 * 1000),
  };
  const fiveMinutesUnlabelled = {
    ...fiveMinutes,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const minutesUnlabelled = {
    ...minutes,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const secondsFormat = format({ ...HOUR_FORMAT, second: '2-digit' });
  const secondsRaster: Raster = {
    unit: 'second',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: hhMmSs * m,
    intervals: millisecondIntervals(1000),
    detailedLabelFormat: format({
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...HOUR_FORMAT,
      minute: 'numeric',
      second: 'numeric',
    }),
    minorTickLabelFormat: (ms) => secondsFormat(ms).padStart(2, '0'),
  };
  const quarterMinutes = {
    ...secondsRaster,
    unitMultiplier: 15,
    intervals: millisecondIntervals(15 * 1000),
  };
  const quarterMinutesUnlabelled = {
    ...quarterMinutes,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const fiveSeconds = {
    ...secondsRaster,
    unitMultiplier: 5,
    intervals: millisecondIntervals(5 * 1000),
  };
  const fiveSecondsUnlabelled = {
    ...fiveSeconds,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const secondsUnlabelled = {
    ...secondsRaster,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const msFormat = (ms: number) => `${ms % 1000}ms`;
  const milliseconds: Raster = {
    unit: 'millisecond',
    unitMultiplier: 1,
    labeled: true,
    minimumTickPixelDistance: m * 1.8,
    intervals: millisecondIntervals(1),
    minorTickLabelFormat: msFormat,
    detailedLabelFormat: msFormat,
  };
  const tenMilliseconds = {
    ...milliseconds,
    unitMultiplier: 10,
    intervals: millisecondIntervals(10),
  };
  const hundredMilliseconds = {
    ...milliseconds,
    unitMultiplier: 100,
    intervals: millisecondIntervals(100),
  };
  const millisecondsUnlabelled = {
    ...milliseconds,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const tenMillisecondsUnlabelled = {
    ...tenMilliseconds,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };
  const hundredMillisecondsUnlabelled = {
    ...hundredMilliseconds,
    labeled: false,
    minimumTickPixelDistance: unlabeledDistance,
  };

  const all: readonly Raster[] = [
    decades,
    yearsUnlabelled,
    years,
    quartersUnlabelled,
    quarters,
    monthsUnlabelled,
    shortMonths,
    months,
    weeksUnlabelled,
    weekStartDays,
    daysUnlabelled,
    days,
    sixHoursUnlabelled,
    sixHours,
    hoursUnlabelled,
    hours,
    quarterHoursUnlabelled,
    quarterHours,
    fiveMinutesUnlabelled,
    fiveMinutes,
    minutesUnlabelled,
    minutes,
    quarterMinutesUnlabelled,
    quarterMinutes,
    fiveSecondsUnlabelled,
    fiveSeconds,
    secondsUnlabelled,
    secondsRaster,
    hundredMillisecondsUnlabelled,
    hundredMilliseconds,
    tenMillisecondsUnlabelled,
    tenMilliseconds,
    millisecondsUnlabelled,
    milliseconds,
  ];
  const replacements: readonly (readonly [
    Raster,
    ReadonlyMap<Raster, readonly Raster[]>,
  ])[] = [
    [decadesUnlabelled, new Map()],
    [decades, new Map([[decadesUnlabelled, []]])],
    [
      years,
      new Map([
        [decades, [decadesUnlabelled]],
        [yearsUnlabelled, []],
      ]),
    ],
    [
      quarters,
      new Map([
        [quartersUnlabelled, []],
        [decadesUnlabelled, []],
      ]),
    ],
    [
      shortMonths,
      new Map([
        [monthsUnlabelled, []],
        [quarters, [quartersUnlabelled]],
      ]),
    ],
    [
      months,
      new Map([
        [monthsUnlabelled, []],
        [shortMonths, []],
      ]),
    ],
    [weekStartDays, new Map([[weeksUnlabelled, []]])],
    [weeksUnlabelled, new Map([[quartersUnlabelled, []]])],
    [
      days,
      new Map([
        [daysUnlabelled, []],
        [weekStartDays, [weeksUnlabelled]],
      ]),
    ],
    [sixHours, new Map([[sixHoursUnlabelled, []]])],
    [
      hours,
      new Map([
        [hoursUnlabelled, []],
        [sixHours, [sixHoursUnlabelled]],
      ]),
    ],
    [
      quarterHours,
      new Map([
        [quarterHoursUnlabelled, []],
        [hours, []],
        [sixHours, []],
      ]),
    ],
    [
      fiveMinutes,
      new Map([
        [fiveMinutesUnlabelled, []],
        [quarterHours, [quarterHoursUnlabelled]],
        [hours, []],
        [sixHours, []],
      ]),
    ],
    [
      minutes,
      new Map([
        [minutesUnlabelled, []],
        [quarterHours, [quarterHoursUnlabelled]],
        [fiveMinutes, [fiveMinutesUnlabelled]],
        [hours, []],
        [sixHours, []],
      ]),
    ],
    [
      quarterMinutes,
      new Map([
        [quarterMinutesUnlabelled, []],
        [minutes, []],
      ]),
    ],
    [
      fiveSeconds,
      new Map([
        [fiveSecondsUnlabelled, []],
        [quarterMinutes, [quarterMinutesUnlabelled]],
        [minutes, []],
      ]),
    ],
    [
      secondsRaster,
      new Map([
        [secondsUnlabelled, []],
        [quarterMinutes, [quarterMinutesUnlabelled]],
        [fiveSeconds, [fiveSecondsUnlabelled]],
        [minutes, []],
      ]),
    ],
    [hundredMilliseconds, new Map([[hundredMillisecondsUnlabelled, []]])],
    [
      tenMilliseconds,
      new Map([
        [tenMillisecondsUnlabelled, []],
        [hundredMilliseconds, [hundredMillisecondsUnlabelled]],
      ]),
    ],
    [
      milliseconds,
      new Map([
        [millisecondsUnlabelled, []],
        [tenMilliseconds, [tenMillisecondsUnlabelled]],
        [hundredMilliseconds, [hundredMillisecondsUnlabelled]],
      ]),
    ],
  ];
  /** The rasters drawn when the first `count` of `all` pass, finest first. */
  const select = (count: number): Raster[] => {
    let layers = all.slice(0, count);
    for (const [key, rules] of replacements) {
      if (layers.includes(key)) {
        layers = [
          ...new Set(layers.flatMap((layer) => rules.get(layer) ?? [layer])),
        ];
      }
    }
    return layers.reverse();
  };
  return { all, select };
};

const partitionWidth = ({ unit, unitMultiplier }: Raster) =>
  UNIT_SECONDS[unit] * unitMultiplier;

/** What {@link resolveTimeTicks} takes: the time domain and bucket Elastic Charts computes, and where labels print. */
export interface TimeTicksInput {
  /** The domain's first and last x, epoch milliseconds, before any bucket extension. */
  readonly min: number;
  readonly max: number;
  /** The bucket width, milliseconds: Elastic Charts' `minInterval`. */
  readonly interval: number;
  /** Bars fill each bucket, so the domain runs one bucket past `max`. */
  readonly extend: boolean;
  readonly locale: string;
  readonly timeZone: string;
  /** The widest plot the axis can be drawn at; bands for wider ones are left out. */
  readonly maxWidth?: number;
}

/**
 * The two-row time axis Elastic Charts draws for a domain and bucket, at every
 * plot width: one band per change in the rasters it picks. Absent when no
 * raster fits at any width: the span outruns the coarsest, or the bucket is wider.
 */
export const resolveTimeTicks = ({
  min,
  max,
  interval,
  extend,
  locale,
  timeZone,
  maxWidth,
}: TimeTicksInput): SceneTimeTicks | undefined => {
  const { all, select } = createRasters(locale, timeZone);
  const fromS = min / 1000;
  const binS = interval / 1000;
  const toS = (max + (extend ? interval : 0)) / 1000;
  const span = toS - fromS;
  const spacing = binS / WIDTH_FUDGE;
  // The narrowest plot at which a raster is not too dense, as `notTooDense` decides it.
  const threshold = (raster: Raster, maxCount: number) => {
    const width = partitionWidth(raster);
    if (width < spacing || width < span / maxCount) {
      return Infinity;
    }
    return span <= 0 ? 0 : (span * raster.minimumTickPixelDistance) / width;
  };
  const ticksOf = new Map<Raster, number[]>();
  const valuesOf = (raster: Raster) => {
    let values = ticksOf.get(raster);
    if (values === undefined) {
      values = [...raster.intervals(fromS - binS, toS + binS)]
        .filter(
          (bin) =>
            !(bin.labelSupremum !== bin.supremum && bin.minimum < fromS) &&
            bin.supremum > fromS &&
            bin.minimum <= toS
        )
        .map((bin) => 1000 * bin.minimum)
        .filter(Number.isFinite);
      ticksOf.set(raster, values);
    }
    return values;
  };
  const layersOf = (count: number, from: number): SceneTimeLayer[] => {
    let row = -1;
    const layers: SceneTimeLayer[] = [];
    for (const raster of select(count)) {
      if (raster.labeled) {
        row++;
      }
      if (row >= LAYER_COUNT) {
        break;
      }
      const values = valuesOf(raster);
      if (values.length === 0) {
        continue;
      }
      const label = !raster.labeled
        ? () => ''
        : row === LAYER_COUNT - 1
          ? raster.detailedLabelFormat
          : raster.minorTickLabelFormat;
      layers.push({
        row: row as SceneTimeLayer['row'],
        labeled: raster.labeled,
        grid: threshold(raster, MAX_TIME_GRID_COUNT) <= from,
        ticks: values
          .filter((value, index) => !(row === 0 && index === 0 && value < min))
          .map((at) => ({ at, label: label(at) })),
      });
    }
    return layers;
  };
  if (!Number.isFinite(threshold(all[0]!, MAX_TIME_TICK_COUNT))) {
    return undefined;
  }
  const bands: SceneTimeBand[] = [{ from: 0, layers: [] }];
  let from = 0;
  for (let count = 1; count <= all.length; count++) {
    const raster = all[count - 1]!;
    const needs = threshold(raster, MAX_TIME_TICK_COUNT);
    if (!Number.isFinite(needs)) {
      break;
    }
    from = Math.max(from, needs);
    if (maxWidth !== undefined && from > maxWidth) {
      break;
    }
    const band = { from, layers: layersOf(count, from) };
    const last = bands.at(-1)!;
    if (last.from === from) {
      bands[bands.length - 1] = band;
    } else if (JSON.stringify(last.layers) !== JSON.stringify(band.layers)) {
      bands.push(band);
    }
  }
  return {
    domain: { min, max: max + (extend ? interval : 0) },
    interval,
    bands,
  };
};

/** The band of `ticks` drawn at a plot `width` in CSS pixels: the last whose `from` it reaches. */
export const timeTicksAt = (
  ticks: SceneTimeTicks,
  width: number
): SceneTimeBand => {
  let band = ticks.bands[0]!;
  for (const candidate of ticks.bands) {
    if (candidate.from <= width) {
      band = candidate;
    }
  }
  return band;
};
