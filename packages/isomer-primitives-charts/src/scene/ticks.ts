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
  return [Math.min(finite(low!, min), min), Math.max(finite(high!, max), max)];
};

/** d3's linear ticks inside `[min, max]`. */
export const linearTicks = (min: number, max: number, count: number) =>
  min === max ? [min] : scaleLinear().domain([min, max]).ticks(count);

/** A positive `[min, max]` widened to powers of ten. */
export const niceLogDomain = (min: number, max: number): [number, number] => {
  const [low, high] = scaleLog().domain([min, max]).nice().domain();
  return [finite(low!, min), finite(high!, max)];
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

// `[from, to]` cut where `zone`'s offset changes, as `[from, to, offset]`; a stretch whose ends share an offset stays whole.
const offsetSegments = (
  from: number,
  to: number,
  zone: string
): Array<[number, number, number]> => {
  const offset = offsetAt(from, zone);
  if (offset === offsetAt(to, zone)) {
    return [[from, to, offset]];
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
  return [[from, after, offset], ...offsetSegments(after, to, zone)];
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
  const ticks = offsetSegments(min, max, zone)
    .flatMap(([from, to, offset], index, segments) => {
      // A wall time the next offset skips lands that far later, so it can still fall inside `max`.
      const skipped = Math.max(
        0,
        (segments[index + 1]?.[2] ?? offset) - offset
      );
      const low = clampEpoch(from + offset);
      const high = clampEpoch(Math.min(max, to + skipped) + offset);
      return high > low
        ? scaleUtc()
            .domain([low, high])
            .ticks((count * (high - low)) / (max - min))
        : [];
    })
    .flatMap((tick) => fromWall(tick.getTime(), zone))
    .filter((tick) => tick >= min && tick <= max);
  return [...new Set(ticks)].sort((a, b) => a - b);
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
  const [low, high] = [toWall(min, zone), toWall(max, zone)];
  if (!calendar(...wallRange(min, max, zone))) {
    const [niceLow, niceHigh] = niceDomain(min, max, count);
    return [clampEpoch(niceLow), clampEpoch(niceHigh)];
  }
  // Each end rounds in its own offset, at the step d3 picks for the real span.
  const span = max - min;
  const [lowWall] = scaleUtc()
    .domain([low, low + span])
    .nice(count)
    .domain();
  const [, highWall] = scaleUtc()
    .domain([high - span, high])
    .nice(count)
    .domain();
  const below = fromWall(lowWall!.getTime(), zone).filter((t) => t <= min);
  const above = fromWall(highWall!.getTime(), zone).filter((t) => t >= max);
  return [
    below.length ? Math.max(...below) : min,
    above.length ? Math.min(...above) : max,
  ];
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
