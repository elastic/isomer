/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tick positions for an axis of a given length. Linear steps follow d3's
// `tickStep` (1, 2 or 5 times a power of ten); time steps are calendar-sized.

import { wallClock } from '../format/zone';

const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

/** d3's tick step for `count` ticks across `[start, stop]`. */
export const tickStep = (
  start: number,
  stop: number,
  count: number
): number => {
  const raw = Math.abs(stop - start) / Math.max(1, count);
  if (raw === 0 || !Number.isFinite(raw)) {
    return 1;
  }
  let step = 10 ** Math.floor(Math.log10(raw));
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
  return Number(value.toFixed(Math.min(decimals, 20)));
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
    low = clean(Math.floor(low / step) * step, step);
    high = clean(Math.ceil(high / step) * step, step);
  }
  return [low, high];
};

/** Linear ticks inside `[min, max]`. */
export const linearTicks = (
  min: number,
  max: number,
  count: number
): number[] => {
  const step = tickStep(min, max, count);
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  const ticks: number[] = [];
  for (let index = first; index <= last; index += 1) {
    ticks.push(clean(index * step, step));
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
    for (let r = r0; r <= r1; r += 1) {
      ticks.push(r * step);
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
    for (let r = r0; r <= r1; r += 1) {
      ticks.push(r / inverse);
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

const TIME_STEPS = [
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
  DAY,
  2 * DAY,
  7 * DAY,
  30 * DAY,
  91 * DAY,
  365 * DAY,
];

/**
 * Time ticks inside `[min, max]` at the smallest calendar-sized step that gives
 * at most `count`, on round wall-clock times in `timeZone`.
 */
export const timeTicks = (
  min: number,
  max: number,
  count: number,
  timeZone: string
): number[] => {
  const span = max - min;
  const step =
    TIME_STEPS.find((candidate) => span / candidate <= count) ??
    TIME_STEPS[TIME_STEPS.length - 1]!;
  const offset = wallClock(min, timeZone).offset * MINUTE;
  const ticks: number[] = [];
  for (
    let tick = Math.ceil((min + offset) / step) * step - offset;
    tick <= max;
    tick += step
  ) {
    ticks.push(tick);
  }
  return ticks;
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
