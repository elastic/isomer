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

// The earliest instant showing `wall` in `zone`; a wall time an offset change skips names the change itself.
const fromWall = (wall: number, zone: string): number => {
  const candidates = [
    wall - offsetAt(wall - DAY, zone),
    wall - offsetAt(wall + DAY, zone),
  ].filter((epoch) => epoch + offsetAt(epoch, zone) === wall);
  return clampEpoch(
    candidates.length
      ? Math.min(...candidates)
      : wall - offsetAt(wall - DAY, zone)
  );
};

/** `[min, max]` widened to d3's round tick steps; a single value widens by 2%, or to `[0, 1]` at zero. */
export const niceDomain = (
  min: number,
  max: number,
  count: number
): [number, number] => {
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.02, Number.MIN_VALUE);
    return min === 0 ? [0, 1] : [min - padding, max + padding];
  }
  const [low, high] = scaleLinear().domain([min, max]).nice(count).domain();
  return [Math.min(low!, min), Math.max(high!, max)];
};

/** d3's linear ticks inside `[min, max]`. */
export const linearTicks = (min: number, max: number, count: number) =>
  min === max ? [min] : scaleLinear().domain([min, max]).ticks(count);

/** A positive `[min, max]` widened to powers of ten. */
export const niceLogDomain = (min: number, max: number): [number, number] => {
  const [low, high] = scaleLog().domain([min, max]).nice().domain();
  return [low!, high!];
};

/** d3's base-10 log ticks inside a positive `[min, max]`. */
export const logTicks = (min: number, max: number, count: number) =>
  scaleLog().domain([min, max]).ticks(count);

/** d3's time ticks at round wall-clock times in `zone`. */
export const timeTicks = (
  min: number,
  max: number,
  count: number,
  zone: string
): number[] => {
  if (min === max) {
    return [min];
  }
  const [low, high] = [toWall(min, zone), toWall(max, zone)];
  if (!calendar(low, high)) {
    return linearTicks(min, max, count);
  }
  const ticks = scaleUtc()
    .domain([low, high])
    .ticks(count)
    .map((tick) => fromWall(tick.getTime(), zone))
    .filter((tick) => tick >= min && tick <= max);
  return [...new Set(ticks)];
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
    const low = fromWall(day, zone);
    const high = fromWall(clampEpoch(day + DAY), zone);
    return high > low
      ? [Math.min(low, min), high]
      : [clampEpoch(low - DAY), min];
  }
  if (!calendar(toWall(min, zone), toWall(max, zone))) {
    const [low, high] = niceDomain(min, max, count);
    return [clampEpoch(low), clampEpoch(high)];
  }
  const [low, high] = scaleUtc()
    .domain([toWall(min, zone), toWall(max, zone)])
    .nice(count)
    .domain()
    .map((date) => fromWall(date.getTime(), zone));
  return [Math.min(low!, min), Math.max(high!, max)];
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
