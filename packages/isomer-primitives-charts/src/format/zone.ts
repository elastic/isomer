/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one place `/format` uses `Intl`: converting an instant to wall-clock
// fields in an IANA time zone. It asks only for numeric fields from `format()`
// in `en-US` with a 23-hour clock and parses them, because that is what every
// Hermes build supports; `formatToParts`, zone names and other options are
// missing or differ on some. UTC and fixed offsets need no `Intl` at all.

/** The wall-clock reading of one instant in one time zone. */
export interface WallClock {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
  /** 0 (Sunday) – 6. */
  readonly weekday: number;
  /** Minutes east of UTC. */
  readonly offset: number;
}

const UTC_ZONES = new Set(['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT', 'Z', 'Zulu']);

const FIXED_OFFSET = /^([+-])(\d{2}):?(\d{2})$/;

const mod = (value: number, by: number) => ((value % by) + by) % by;

const fromUtcFields = (epoch: number, offset: number): WallClock => {
  const shifted = new Date(epoch + offset * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
    weekday: shifted.getUTCDay(),
    offset,
  };
};

type ZoneReader = (epoch: number) => WallClock;

const readers = new Map<string, ZoneReader>();

const intlReader = (timeZone: string): ZoneReader => {
  if (
    typeof Intl === 'undefined' ||
    typeof Intl.DateTimeFormat !== 'function'
  ) {
    throw new RangeError(
      `Time zone "${timeZone}" needs Intl.DateTimeFormat, which this environment lacks. UTC and fixed offsets such as "+05:30" work without it.`
    );
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (epoch) => {
    const whole = epoch - mod(epoch, 1000);
    // en-US numeric order: month, day, year, hour, minute, second.
    const [month, day, year, hour, minute, second] = (
      formatter.format(new Date(whole)).match(/\d+/g) ?? []
    ).map(Number);
    if (second === undefined || Number.isNaN(second)) {
      throw new RangeError(
        `Intl.DateTimeFormat returned no numeric fields for time zone "${timeZone}"`
      );
    }
    const wall = Date.UTC(year!, month! - 1, day, hour! % 24, minute, second);
    return fromUtcFields(epoch, Math.round((wall - whole) / 60_000));
  };
};

const readerFor = (timeZone: string): ZoneReader => {
  const cached = readers.get(timeZone);
  if (cached) {
    return cached;
  }
  let reader: ZoneReader;
  const fixed = FIXED_OFFSET.exec(timeZone);
  if (UTC_ZONES.has(timeZone)) {
    reader = (epoch) => fromUtcFields(epoch, 0);
  } else if (fixed) {
    const offset =
      (fixed[1] === '-' ? -1 : 1) * (Number(fixed[2]) * 60 + Number(fixed[3]));
    reader = (epoch) => fromUtcFields(epoch, offset);
  } else {
    reader = intlReader(timeZone);
  }
  readers.set(timeZone, reader);
  return reader;
};

/**
 * The wall-clock fields of `epoch` (milliseconds) in `timeZone`: an IANA name
 * such as `Europe/Paris`, `UTC`, or a fixed offset such as `+05:30`. Throws a
 * `RangeError` for a zone the environment cannot resolve.
 */
export const wallClock = (epoch: number, timeZone: string): WallClock =>
  readerFor(timeZone)(epoch);

/**
 * A short name for the zone at `epoch`, for Moment's `z` token. Moment Timezone
 * prints an abbreviation such as `CET`; this prints `UTC` for UTC and the
 * offset, such as `+01:00`, for every other zone, since zone names are not
 * available on every JavaScript engine.
 */
export const zoneAbbreviation = (epoch: number, timeZone: string): string => {
  if (UTC_ZONES.has(timeZone)) {
    return 'UTC';
  }
  const { offset } = wallClock(epoch, timeZone);
  const sign = offset < 0 ? '-' : '+';
  const minutes = Math.abs(offset);
  return `${sign}${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
