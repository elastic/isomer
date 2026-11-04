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

/** Powers of ten inside `[min, max]`, for a log axis. */
export const logTicks = (min: number, max: number): number[] => {
  const ticks: number[] = [];
  const low = Math.floor(Math.log10(Math.max(min, Number.MIN_VALUE)));
  const high = Math.ceil(Math.log10(Math.max(max, Number.MIN_VALUE)));
  for (let power = low; power <= high; power += 1) {
    const value = 10 ** power;
    if (value >= min && value <= max) {
      ticks.push(value);
    }
  }
  return ticks;
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
