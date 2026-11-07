/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scaleUtc } from 'd3-scale';
import { describe, expect, it } from 'vitest';

import { niceTimeDomain, timeTicks } from './ticks';

// Expected ticks come from `Intl` wall clocks walked by brute force, sharing no code with `ticks.ts`.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const formats = new Map<string, Intl.DateTimeFormat>();

const wallOf = (epoch: number, zone: string) => {
  const format =
    formats.get(zone) ??
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      fractionalSecondDigits: 3,
    });
  formats.set(zone, format);
  const part = Object.fromEntries(
    format.formatToParts(epoch).map(({ type, value }) => [type, Number(value)])
  );
  return Date.UTC(
    part.year!,
    part.month! - 1,
    part.day,
    part.hour,
    part.minute,
    part.second,
    part.fractionalSecond
  );
};

const offsetOf = (epoch: number, zone: string) => wallOf(epoch, zone) - epoch;

const aligned = (wall: number, step: number) =>
  ((wall % step) + step) % step === 0;

// Each offset change in `[from, to]`, assuming at most one per six hours.
const changesIn = (from: number, to: number, zone: string) => {
  const changes: Array<{ at: number; before: number; after: number }> = [];
  for (let start = from; start < to; start += 6 * HOUR) {
    let [low, high] = [start, Math.min(to, start + 6 * HOUR)];
    const [before, after] = [offsetOf(low, zone), offsetOf(high, zone)];
    if (before === after) {
      continue;
    }
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (offsetOf(middle, zone) === before) {
        low = middle;
      } else {
        high = middle;
      }
    }
    changes.push({ at: high, before, after });
  }
  return changes;
};

// Every whole millisecond in `[min, max]` whose wall clock reads a multiple of `step`, plus each skipped multiple moved forward by the skipped length.
const expectedTicks = (
  min: number,
  max: number,
  step: number,
  zone: string
) => {
  const [first, last] = [Math.ceil(min), Math.floor(max)];
  // A skipped wall time moves forward by at most a day.
  const changes = changesIn(first - DAY, last, zone);
  const ticks: number[] = [];
  const starts = [
    first,
    ...changes.map(({ at }) => at).filter((at) => at > first),
  ];
  starts.forEach((start, index) => {
    const end = starts[index + 1] ?? last + 1;
    const offset = offsetOf(start, zone);
    const wall = start + offset;
    for (
      let tick = start + (((-wall % step) + step) % step || 0);
      tick < end;
      tick += step
    ) {
      ticks.push(tick);
    }
  });
  for (const { at, before, after } of changes) {
    const firstSkipped = Math.ceil((at + before) / step) * step;
    for (let wall = firstSkipped; wall < at + after; wall += step) {
      ticks.push(wall - before);
    }
  }
  return [...new Set(ticks.filter((t) => t >= min && t <= max))].sort(
    (a, b) => a - b
  );
};

const firstChange = (zone: string, near: string) => {
  const at = Date.parse(near);
  const [change] = changesIn(at - 2 * DAY, at + 2 * DAY, zone);
  if (!change) {
    throw new Error(`no offset change near ${near} in ${zone}`);
  }
  return change.at;
};

const CHANGES: Array<[string, string]> = [
  ['America/New_York', '2026-11-01T06:00Z'],
  ['America/New_York', '2026-03-08T07:00Z'],
  ['America/New_York', '1883-11-18T17:00Z'],
  ['Australia/Lord_Howe', '2026-10-03T15:30Z'],
  ['Australia/Lord_Howe', '2026-04-04T15:00Z'],
  ['America/Santiago', '2026-09-06T04:00Z'],
  ['Europe/Helsinki', '2026-10-25T01:00Z'],
  ['Pacific/Apia', '2011-12-30T10:00Z'],
  ['Asia/Kathmandu', '1985-12-31T18:30Z'],
  ['Australia/Eucla', '2008-10-25T17:15Z'],
  ['Pacific/Chatham', '2026-09-26T14:00Z'],
  ['Africa/Monrovia', '1972-01-07T00:44Z'],
];

const DELTAS = [0, 0.75, 1, 1000, 7 * 60_000 + 0.5, HOUR, 5 * HOUR, 30 * HOUR];

// A fixed-seed Lehmer generator, so a failure names a reproducible range.
const random = (() => {
  let seed = 48_271;
  return () => (seed = (seed * 48_271) % 2_147_483_647) / 2_147_483_647;
})();

const cases = CHANGES.flatMap(([zone, near]) => {
  const at = firstChange(zone, near);
  const pairs = DELTAS.flatMap((before) =>
    DELTAS.map((after) => [before, after] as const)
  ).filter(([before, after]) => before + after > 0);
  const drawn = Array.from(
    { length: 6 },
    () => [random() * 40 * HOUR, random() * 40 * HOUR] as const
  );
  return [...pairs, ...drawn].flatMap(([before, after]) =>
    [2, 7].map((count) => ({
      zone,
      min: at - before,
      max: at + after,
      count,
    }))
  );
});

const describeCase = ({ zone, min, max, count }: (typeof cases)[number]) =>
  `${zone} ${min}..${max} count ${count}`;

describe('time ticks against an Intl brute force', () => {
  it(`ticks every round wall time, and only those, in ${cases.length} ranges around offset changes`, () => {
    const failures: string[] = [];
    for (const range of cases) {
      const { zone, min, max, count } = range;
      const utc = scaleUtc()
        .domain([Math.ceil(min), Math.floor(max)])
        .ticks(count)
        .map(Number);
      const ticks = timeTicks(min, max, count, zone);
      if (
        ticks.some(
          (tick, index) =>
            !Number.isFinite(tick) ||
            tick < min ||
            tick > max ||
            (index > 0 && tick <= ticks[index - 1]!)
        )
      ) {
        failures.push(`${describeCase(range)}: unordered or outside`);
        continue;
      }
      const step = utc.length > 1 ? utc[1]! - utc[0]! : DAY;
      if (step >= DAY) {
        continue;
      }
      const expected = expectedTicks(min, max, step, zone);
      if (JSON.stringify(ticks) !== JSON.stringify(expected)) {
        failures.push(
          `${describeCase(range)} step ${step}: got ${JSON.stringify(ticks)}, expected ${JSON.stringify(expected)}`
        );
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  }, 60_000);

  it(`rounds both ends of ${cases.length} ranges around offset changes to round wall times that enclose them`, () => {
    const failures: string[] = [];
    for (const range of cases) {
      const { zone, min, max, count } = range;
      const utc = scaleUtc()
        .domain([Math.floor(min), Math.ceil(max)])
        .ticks(count)
        .map(Number);
      const step = utc.length > 1 ? utc[1]! - utc[0]! : DAY;
      const [low, high] = niceTimeDomain(min, max, count, zone);
      const round = (end: number) =>
        aligned(wallOf(end, zone), step) ||
        aligned(end + offsetOf(end - DAY, zone), step);
      if (
        !Number.isFinite(low) ||
        !Number.isFinite(high) ||
        low > min ||
        high < max ||
        (step < DAY && !(round(low) && round(high)))
      ) {
        failures.push(`${describeCase(range)} step ${step}: [${low}, ${high}]`);
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  }, 60_000);
});
