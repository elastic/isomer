/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ticks and rounded domains are d3-scale's, the version Elastic Charts uses.
// Time ticks are d3's UTC ticks on the Scene's wall-clock time.

import { scaleLinear, scaleLog, scaleUtc } from 'd3-scale';

import { MAX_EPOCH } from '../coordinates';
import { timeZoneOffset } from '../format/zone';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// d3-time loops forever on a date outside the Date range, which rounding near its edges reaches; beyond this, times get linear ticks.
const CALENDAR_LIMIT = MAX_EPOCH / 4;

const calendar = (low: number, high: number) =>
  Math.abs(low) <= CALENDAR_LIMIT && Math.abs(high) <= CALENDAR_LIMIT;

const clampEpoch = (epoch: number) =>
  Math.max(-MAX_EPOCH, Math.min(MAX_EPOCH, epoch));

const offsetAt = (epoch: number, zone: string) =>
  timeZoneOffset(clampEpoch(epoch), zone) * MINUTE;

const toWall = (epoch: number, zone: string) =>
  clampEpoch(epoch + offsetAt(epoch, zone));

// Every instant showing `wall` in `zone`, earliest first: two in a repeated hour, and in a skipped one the instant `wall` names at the earlier offset.
const fromWall = (wall: number, zone: string): number[] => {
  const earlier = wall - offsetAt(wall - DAY, zone);
  const later = wall - offsetAt(wall + DAY, zone);
  const instants = [...new Set([earlier, later])]
    .filter((epoch) => epoch + offsetAt(epoch, zone) === wall)
    .sort((a, b) => a - b);
  return (instants.length ? instants : [earlier]).map(clampEpoch);
};

// A domain end d3 rounded past the largest double falls back to the data's own end.
const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/** `[min, max]` widened to d3's round tick steps; a single value widens by 2%, or to `[0, 1]` at zero. */
export const niceDomain = (
  min: number,
  max: number,
  count: number
): [number, number] => {
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.02, Number.MIN_VALUE);
    return min === 0
      ? [0, 1]
      : [finite(min - padding, min), finite(max + padding, max)];
  }
  const [low, high] = scaleLinear().domain([min, max]).nice(count).domain();
  // `+ 0` turns a rounded `-0` into `0`.
  return [
    Math.min(finite(low!, min), min) + 0,
    Math.max(finite(high!, max), max) + 0,
  ];
};

/** d3's linear ticks inside `[min, max]`. */
export const linearTicks = (min: number, max: number, count: number) =>
  min === max ? [min] : scaleLinear().domain([min, max]).ticks(count);

/** A positive `[min, max]` widened to powers of ten. */
export const niceLogDomain = (min: number, max: number): [number, number] => {
  const [low, high] = scaleLog().domain([min, max]).nice().domain();
  const positive = (value: number, fallback: number) =>
    value > 0 && Number.isFinite(value) ? value : fallback;
  return [positive(low!, min), positive(high!, max)];
};

/** d3's base-10 log ticks inside a positive `[min, max]`. */
export const logTicks = (min: number, max: number, count: number) =>
  scaleLog().domain([min, max]).ticks(count);

// Every wall time `zone` shows between `min` and `max`, including both sides of an offset change.
const wallRange = (min: number, max: number, zone: string) => {
  const offsets = [offsetAt(min, zone), offsetAt(max, zone)];
  return [
    clampEpoch(min + Math.min(...offsets)),
    clampEpoch(max + Math.max(...offsets)),
  ] as const;
};

// Each stretch of the whole milliseconds `[from, to]` at one offset of `zone`, as `[start, offset]`, earliest first. A stretch whose ends share an offset stays whole.
const offsetStretches = (
  from: number,
  to: number,
  zone: string
): Array<[number, number]> => {
  const offset = offsetAt(from, zone);
  if (offset === offsetAt(to, zone)) {
    return [[from, offset]];
  }
  let [before, after] = [from, to];
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (offsetAt(middle, zone) === offset) {
      before = middle;
    } else {
      after = middle;
    }
  }
  return [[from, offset], ...offsetStretches(after, to, zone)];
};

/** d3's time ticks at round wall-clock times in `zone`, as dense as d3's ticks over the same span in UTC. */
export const timeTicks = (
  min: number,
  max: number,
  count: number,
  zone: string
): number[] => {
  if (min === max) {
    return [min];
  }
  if (!calendar(...wallRange(min, max, zone))) {
    return linearTicks(min, max, count);
  }
  // Ticks are whole milliseconds.
  const [first, last] = [Math.ceil(min), Math.floor(max)];
  if (first >= last) {
    return first === last ? [first] : [];
  }
  const inside = (tick: number) => tick >= first && tick <= last;
  // A wall time skipped up to a day before `first` can move forward into it.
  const stretches = offsetStretches(first - DAY, last, zone);
  const utc = scaleUtc().domain([first, last]).ticks(count).map(Number);
  const step = utc.length > 1 ? utc[1]! - utc[0]! : DAY;
  // Below a day, d3's UTC ticks are multiples of their step, so they are round local times wherever the offset is one too.
  if (step < DAY && stretches.every(([, offset]) => offset % step === 0)) {
    return utc.filter(inside);
  }
  const span = last - first;
  const ticks = stretches.flatMap(([start, offset], index) => {
    const [end, next] = stretches[index + 1] ?? [last + 1, offset];
    // A wall time the next offset skips moves forward by the skipped length.
    const wallEnd = end + offset + Math.max(0, next - offset);
    const anchor = Math.max(start, first) + offset;
    return scaleUtc()
      .domain([anchor, anchor + span])
      .ticks(count)
      .map(Number)
      .filter((wall) => wall >= start + offset && wall < wallEnd)
      .flatMap((wall) => fromWall(wall, zone));
  });
  return [...new Set(ticks.filter(inside))].sort((a, b) => a - b);
};

/** `[min, max]` widened to d3's round wall-clock times in `zone`; a single instant widens to its local day. */
export const niceTimeDomain = (
  min: number,
  max: number,
  count: number,
  zone: string
): [number, number] => {
  if (min === max) {
    const day = Math.floor(toWall(min, zone) / DAY) * DAY;
    const [low] = fromWall(day, zone) as [number];
    const [high] = fromWall(clampEpoch(day + DAY), zone) as [number];
    return high > low
      ? [Math.min(low, min), high]
      : [clampEpoch(low - DAY), min];
  }
  const [first, last] = [Math.floor(min), Math.ceil(max)];
  const span = last - first;
  if (!calendar(...wallRange(first - span, last + span, zone))) {
    const [niceLow, niceHigh] = niceDomain(min, max, count);
    return [clampEpoch(niceLow), clampEpoch(niceHigh)];
  }
  // Each end moves out to the nearest tick, at the step d3 picks for the real span.
  const below = timeTicks(first - span, first, count, zone);
  const [above] = timeTicks(last, last + span, count, zone);
  return [below.at(-1) ?? first, above ?? last];
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
