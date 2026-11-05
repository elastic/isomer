/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tick positions for an axis of a given length. Linear steps follow d3's
// `tickStep` (1, 2 or 5 times a power of ten); time steps are calendar-sized.

import { timeZoneOffset } from '../format/zone';

const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

/** d3's tick step for `count` ticks across `[start, stop]`. */
export const tickStep = (
  start: number,
  stop: number,
  count: number
): number => {
  const raw = Math.abs(stop / Math.max(1, count) - start / Math.max(1, count));
  if (raw === 0 || !Number.isFinite(raw)) {
    return 1;
  }
  let step = 10 ** Math.floor(Math.log10(raw)) || Number.MIN_VALUE;
  const error = raw / step;
  if (error >= E10) {
    step *= 10;
  } else if (error >= E5) {
    step *= 5;
  } else if (error >= E2) {
    step *= 2;
  }
  return step;
};

/** Rounds floating-point noise from a multiple of `step`. */
const clean = (value: number, step: number) => {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  // `toFixed` stops at 20 decimals, which would round tiny values to zero.
  return decimals > 20
    ? Number(value.toPrecision(15))
    : Number(value.toFixed(decimals));
};

/** `[min, max]` widened to multiples of the tick step, as d3's `nice`. */
export const niceDomain = (
  min: number,
  max: number,
  count: number
): [number, number] => {
  if (min === max) {
    return min === 0 ? [0, 1] : min > 0 ? [0, min] : [min, 0];
  }
  let low = min;
  let high = max;
  for (let pass = 0; pass < 2; pass += 1) {
    const step = tickStep(low, high, count);
    const roundedLow = clean(Math.floor(low / step) * step, step);
    const roundedHigh = clean(Math.ceil(high / step) * step, step);
    low = Number.isFinite(roundedLow) ? roundedLow : min;
    high = Number.isFinite(roundedHigh) ? roundedHigh : max;
  }
  return [Math.min(low, min), Math.max(high, max)];
};

/** Linear ticks inside `[min, max]`. */
export const linearTicks = (
  min: number,
  max: number,
  count: number
): number[] => {
  if (min === max) {
    return [min];
  }
  const step = tickStep(min, max, count);
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  const ticks: number[] = [];
  const length = Math.min(
    Math.ceil(count * 2) + 2,
    Math.max(0, last - first + 1)
  );
  for (let index = 0; index < length; index += 1) {
    const value = clean((first + index) * step, step);
    if (
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      ticks.at(-1) !== value
    ) {
      ticks.push(value);
    }
  }
  return ticks;
};

const pow10 = (exponent: number) =>
  Number.isFinite(exponent)
    ? Number(`1e${exponent}`)
    : exponent < 0
      ? 0
      : exponent;

/** d3-array 2's `ticks`, which d3's log scale falls back to. */
const d3Ticks = (start: number, stop: number, count: number): number[] => {
  if (start === stop && count > 0) {
    return [start];
  }
  const raw = (stop - start) / Math.max(0, count);
  const power = Math.floor(Math.log(raw) / Math.LN10);
  const error = raw / 10 ** power;
  const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
  const ticks: number[] = [];
  if (power >= 0) {
    const step = factor * 10 ** power;
    if (!Number.isFinite(step) || step === 0) {
      return [];
    }
    let r0 = Math.round(start / step);
    let r1 = Math.round(stop / step);
    if (r0 * step < start) {
      ++r0;
    }
    if (r1 * step > stop) {
      --r1;
    }
    for (let index = 0; index <= Math.min(count * 2 + 2, r1 - r0); index += 1) {
      ticks.push((r0 + index) * step);
    }
  } else {
    const inverse = 10 ** -power / factor;
    let r0 = Math.round(start * inverse);
    let r1 = Math.round(stop * inverse);
    if (r0 / inverse < start) {
      ++r0;
    }
    if (r1 / inverse > stop) {
      --r1;
    }
    for (let index = 0; index <= Math.min(count * 2 + 2, r1 - r0); index += 1) {
      ticks.push((r0 + index) / inverse);
    }
  }
  return ticks;
};

/** `[min, max]` widened to powers of ten, as d3's log `nice`. */
export const niceLogDomain = (min: number, max: number): [number, number] => [
  pow10(Math.floor(Math.log10(min))),
  pow10(Math.ceil(Math.log10(max))),
];

/**
 * Ticks for a base-10 log axis over a positive `[min, max]`, as d3-scale 3's
 * `scaleLog().ticks(count)`, which Elastic Charts uses: 1–9 times each power
 * of ten inside the domain, or linear ticks when those are too few.
 */
export const logTicks = (min: number, max: number, count: number): number[] => {
  const i = Math.log10(min);
  const j = Math.log10(max);
  if (j - i < count) {
    const ticks: number[] = [];
    for (
      let exponent = Math.floor(i);
      exponent <= Math.ceil(j);
      exponent += 1
    ) {
      const power = pow10(exponent);
      for (let k = 1; k < 10; k += 1) {
        const tick = power * k;
        if (tick < min) {
          continue;
        }
        if (tick > max) {
          break;
        }
        ticks.push(tick);
      }
    }
    return ticks.length * 2 < count ? d3Ticks(min, max, count) : ticks;
  }
  return d3Ticks(i, j, Math.min(j - i, count)).map(pow10);
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface TimeStep {
  unit: 'elapsed' | 'hour' | 'day' | 'week' | 'month' | 'year';
  step: number;
  duration: number;
}

const timeSteps = (span: number, count: number): TimeStep[] => [
  ...[
    1,
    5,
    10,
    50,
    100,
    250,
    500,
    SECOND,
    5 * SECOND,
    15 * SECOND,
    30 * SECOND,
    MINUTE,
    5 * MINUTE,
    15 * MINUTE,
    30 * MINUTE,
    HOUR,
    3 * HOUR,
    6 * HOUR,
    12 * HOUR,
  ].map((step): TimeStep =>
    step > HOUR
      ? { unit: 'hour', step: step / HOUR, duration: step }
      : { unit: 'elapsed', step, duration: step }
  ),
  { unit: 'day', step: 1, duration: DAY },
  { unit: 'day', step: 2, duration: 2 * DAY },
  { unit: 'week', step: 1, duration: 7 * DAY },
  { unit: 'month', step: 1, duration: 30 * DAY },
  { unit: 'month', step: 3, duration: 91 * DAY },
  { unit: 'year', step: 1, duration: 365 * DAY },
  {
    unit: 'year',
    step: Math.max(2, Math.ceil(span / (365 * DAY * Math.max(1, count - 1)))),
    duration:
      Math.max(2, Math.ceil(span / (365 * DAY * Math.max(1, count - 1)))) *
      365 *
      DAY,
  },
];

const localTime = (epoch: number, zone: string) =>
  epoch + timeZoneOffset(epoch, zone) * MINUTE;

/**
 * The instant a local wall-clock time names in `zone`: the earliest occurrence
 * after `after` when given, else the earliest. A local time skipped by an
 * offset change names the moment of the change, so a day still starts on its
 * own date.
 */
const fromLocal = (local: number, zone: string, after?: number): number => {
  // With the offset in force before the change, a skipped time lands on the change itself.
  const before = local - timeZoneOffset(local - DAY, zone) * MINUTE;
  const following = local - timeZoneOffset(local + DAY, zone) * MINUTE;
  const valid = [...new Set([before, following])]
    .filter((epoch) => localTime(epoch, zone) === local)
    .sort((a, b) => a - b);
  const options = valid.length > 0 ? valid : [before];
  return (
    options.find((epoch) => after === undefined || epoch > after) ??
    options[options.length - 1]!
  );
};

const floorTime = (epoch: number, { unit, step }: TimeStep, zone: string) => {
  const local = localTime(epoch, zone);
  if (unit === 'elapsed') {
    return (
      Math.floor(local / step) * step - timeZoneOffset(epoch, zone) * MINUTE
    );
  }
  const date = new Date(local);
  if (unit === 'hour') {
    date.setUTCHours(Math.floor(date.getUTCHours() / step) * step, 0, 0, 0);
    return fromLocal(date.getTime(), zone);
  }
  date.setUTCHours(0, 0, 0, 0);
  if (unit === 'week') {
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  } else if (unit === 'month') {
    date.setUTCDate(1);
    date.setUTCMonth(Math.floor(date.getUTCMonth() / step) * step);
  } else if (unit === 'year') {
    date.setUTCMonth(0, 1);
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / step) * step);
  } else {
    date.setUTCDate(Math.floor((date.getUTCDate() - 1) / step) * step + 1);
  }
  return fromLocal(date.getTime(), zone);
};

const advanceTime = (epoch: number, { unit, step }: TimeStep, zone: string) => {
  if (unit === 'elapsed') {
    return epoch + step;
  }
  const date = new Date(localTime(epoch, zone));
  if (unit === 'hour') {
    date.setUTCHours(date.getUTCHours() + step);
  } else if (unit === 'year') {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  } else if (unit === 'month') {
    date.setUTCMonth(date.getUTCMonth() + step);
  } else {
    date.setUTCDate(date.getUTCDate() + (unit === 'week' ? 7 : step));
  }
  if (unit !== 'hour') {
    // A day that started late after a skipped midnight must not shift the next.
    date.setUTCHours(0, 0, 0, 0);
  }
  return fromLocal(date.getTime(), zone, epoch);
};

const chooseTimeStep = (min: number, max: number, count: number) =>
  timeSteps(max - min, count).find(
    ({ duration }) => (max - min) / duration <= count
  )!;

/** Time ticks at round local times, with calendar steps across offset changes. */
export const timeTicks = (
  min: number,
  max: number,
  count: number,
  timeZone: string
): number[] => {
  if (min === max) {
    return [min];
  }
  const candidates = timeSteps(max - min, count);
  const duration = chooseTimeStep(min, max, count).duration;
  for (const candidate of candidates.filter(
    (entry) => entry.duration >= duration
  )) {
    let tick = floorTime(min, candidate, timeZone);
    const ticks: number[] = [];
    for (let index = 0; index <= count + 1 && tick <= max; index += 1) {
      if (tick >= min) {
        ticks.push(tick);
      }
      const next = advanceTime(tick, candidate, timeZone);
      if (!(next > tick)) {
        break;
      }
      tick = next;
    }
    if (ticks.length <= count) {
      return ticks;
    }
  }
  return [];
};

/** Calendar domain bounds, widened in the requested zone. */
export const niceTimeDomain = (
  min: number,
  max: number,
  count: number,
  zone: string
): [number, number] => {
  const step = chooseTimeStep(min, max, count);
  const low = floorTime(min, step, zone);
  const floorHigh = floorTime(max, step, zone);
  return [low, floorHigh === max ? max : advanceTime(floorHigh, step, zone)];
};

/** Tick count for an axis `length` pixels long, one tick per `spacing` pixels. */
export const tickCount = (
  length: number | undefined,
  spacing: number,
  fallback: number
): number =>
  length === undefined
    ? fallback
    : Math.max(2, Math.min(10, Math.round(length / spacing)));
