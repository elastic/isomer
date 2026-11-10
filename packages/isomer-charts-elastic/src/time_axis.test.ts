/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The resolver's time ticks against Elastic Charts' own multi-layer time axis
// (`multilayerAxisEntry`, which Lens draws through), over intervals from
// milliseconds to years, time zones with and without daylight saving, locales,
// bars and lines, and plot widths from narrow to wide. Each case runs Elastic
// Charts' rasters at a width and compares every tick, label, row and grid flag
// with the band `timeTicksAt` picks for that width.

import * as visibleTicks from '@elastic/charts/dist/chart_types/xy_chart/axes/ticks/visible_ticks';
import * as multilayerTicks from '@elastic/charts/dist/chart_types/xy_chart/axes/timeslip/multilayer_ticks';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type SceneTimeTicks,
  timeTicksAt,
} from '@elastic/isomer-primitives-charts/scene';
import type { XyChartNode } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

// Elastic Charts' internals, which its declarations leave out.
interface ElasticTick {
  readonly value: unknown;
  readonly label: string;
  readonly layer?: number;
  readonly showGrid: boolean;
}
type LabelFormat = (value: number) => string;
type MeasuredTicks = (
  scale: unknown,
  ticks: number[],
  layer: number,
  detailedLayer: number,
  format: LabelFormat,
  showGrid?: boolean
) => { ticks: ElasticTick[]; scale: unknown };
const { multilayerAxisEntry } = multilayerTicks as unknown as {
  multilayerAxisEntry: (
    xDomain: unknown,
    extendByOneBin: boolean,
    range: [number, number],
    timeAxisLayerCount: number,
    scale: unknown,
    getMeasuredTicks: MeasuredTicks,
    locale: string,
    dow: number
  ) => { ticks?: ElasticTick[] };
};
const { generateTicks } = visibleTicks as unknown as {
  generateTicks: (
    scale: unknown,
    ticks: number[],
    offset: number,
    layoutTickLabel: () => unknown,
    formatTickLabel: LabelFormat,
    layer: number,
    detailedLayer: number,
    showGrid: boolean,
    multilayerTimeAxis: boolean
  ) => ElasticTick[];
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface Case {
  readonly name: string;
  readonly start: number;
  readonly count: number;
  readonly step: number;
  readonly interval?: number;
  readonly timeZone: string;
  readonly locales?: readonly string[];
}

const CASES: readonly Case[] = [
  {
    name: '100 ms buckets over 4 seconds',
    start: Date.UTC(2026, 10, 3, 12),
    count: 40,
    step: 100,
    timeZone: 'UTC',
  },
  {
    name: '30 s buckets over 20 minutes',
    start: Date.UTC(2026, 10, 3, 12, 5),
    count: 40,
    step: 30 * SECOND,
    timeZone: 'Europe/Berlin',
  },
  {
    name: 'minute buckets over two hours',
    start: Date.UTC(2026, 10, 3, 23, 10),
    count: 120,
    step: MINUTE,
    timeZone: 'UTC',
    locales: ['en', 'de', 'ja'],
  },
  {
    name: 'hourly buckets across the end of DST in New York',
    start: Date.UTC(2026, 9, 31, 4),
    count: 72,
    step: HOUR,
    interval: HOUR,
    timeZone: 'America/New_York',
    locales: ['en', 'fr-FR'],
  },
  {
    name: 'hourly buckets across the start of DST in New York',
    start: Date.UTC(2026, 2, 7, 5),
    count: 48,
    step: HOUR,
    timeZone: 'America/New_York',
  },
  {
    name: '3 h buckets across the end of DST in Berlin',
    start: Date.UTC(2026, 9, 20),
    count: 80,
    step: 3 * HOUR,
    timeZone: 'Europe/Berlin',
    locales: ['en', 'de'],
  },
  {
    name: '30 min buckets in a half-hour zone',
    start: Date.UTC(2026, 10, 3, 18, 30),
    count: 96,
    step: 30 * MINUTE,
    timeZone: 'Asia/Kolkata',
  },
  {
    name: 'daily buckets across a midnight DST gap in Santiago',
    start: Date.UTC(2026, 7, 20, 4),
    count: 40,
    step: DAY,
    timeZone: 'America/Santiago',
  },
  {
    name: 'daily buckets across a half-hour DST shift',
    start: Date.UTC(2026, 9, 1),
    count: 21,
    step: DAY,
    timeZone: 'Australia/Lord_Howe',
  },
  {
    name: 'daily buckets over two months',
    start: Date.UTC(2026, 9, 1),
    count: 61,
    step: DAY,
    interval: DAY,
    timeZone: 'UTC',
    locales: ['en', 'de', 'ja'],
  },
  {
    name: 'weekly buckets over a year',
    start: Date.UTC(2026, 0, 5),
    count: 52,
    step: 7 * DAY,
    timeZone: 'UTC',
  },
  {
    name: 'monthly buckets over three years',
    start: Date.UTC(2024, 0, 1),
    count: 36,
    step: 30 * DAY,
    interval: 30 * DAY,
    timeZone: 'Australia/Sydney',
    locales: ['en', 'de'],
  },
  {
    name: 'yearly buckets over thirty years',
    start: Date.UTC(1996, 0, 1),
    count: 30,
    step: 365 * DAY,
    timeZone: 'UTC',
  },
  {
    name: 'one bucket',
    start: Date.UTC(2026, 10, 3, 12),
    count: 1,
    step: HOUR,
    interval: HOUR,
    timeZone: 'UTC',
  },
];

const WIDTHS = [
  40, 80, 120, 160, 200, 260, 320, 400, 480, 560, 640, 760, 900, 1100, 1400,
  1800, 2400,
];

const nodeOf = (
  { start, count, step, interval, timeZone }: Case,
  mark: 'bar' | 'line'
): XyChartNode => ({
  type: 'xyChart',
  data: {
    columns: [
      {
        id: 'time',
        label: 'time',
        type: 'date',
        role: 'dimension',
        format: { kind: 'date', timeZone },
      },
      { id: 'count', label: 'count', type: 'number', role: 'metric' },
    ],
    rows: Array.from({ length: count }, (_, index) => [
      start + index * step,
      index % 7,
    ]),
  },
  layers: [{ kind: 'data', mark, x: 'time', y: [{ column: 'count' }] }],
  axes: {
    x: { scale: 'temporal', ...(interval === undefined ? {} : { interval }) },
  },
});

interface Tick {
  readonly value: number;
  readonly label: string;
  readonly row: number;
  readonly grid: boolean;
}

/** What Elastic Charts' multi-layer axis draws at `width`, before it measures labels. */
const elasticTicks = (
  { domain, interval }: SceneTimeTicks,
  extend: boolean,
  max: number,
  timeZone: string,
  locale: string,
  width: number
): Tick[] => {
  // Positions far from the axis's end and far apart, so no label is measured out.
  const scale = {
    type: 'time',
    domain: [domain.min, max],
    bandwidth: 0,
    scale: (value: number) => (value - 1e13) * 1000,
    isSingleValue: () => false,
  };
  const entry = multilayerAxisEntry(
    { domain: [domain.min, max], minInterval: interval, timeZone },
    extend,
    [0, width],
    2,
    scale,
    (_scale, ticks, layer, detailedLayer, format, showGrid = true) => ({
      ticks: generateTicks(
        scale,
        ticks,
        0,
        () => ({ bboxWidth: 0, bboxHeight: 0 }),
        format,
        layer,
        detailedLayer,
        showGrid,
        true
      ),
      scale,
    }),
    locale,
    1
  );
  return (entry.ticks ?? []).map((tick) => ({
    value: tick.value as number,
    label: tick.label,
    row: tick.layer ?? NaN,
    grid: tick.showGrid,
  }));
};

const sceneTicks = (ticks: SceneTimeTicks, width: number): Tick[] =>
  timeTicksAt(ticks, width).layers.flatMap(({ row, grid, ticks: layer }) =>
    layer.map(({ at, label }) => ({ value: at, label, row, grid }))
  );

describe('time ticks: the resolver against Elastic Charts’ multi-layer axis', () => {
  const runs = CASES.flatMap((one) =>
    (['line', 'bar'] as const).flatMap((mark) =>
      (one.locales ?? ['en']).map((locale) => ({ ...one, mark, locale }))
    )
  );
  it.each(runs)('$name, $mark, $locale', (run) => {
    const scene = resolveChart(nodeOf(run, run.mark), {
      scheme: 'light',
      locale: run.locale,
    });
    const ticks = scene.axes.x.timeTicks!;
    expect(ticks).toBeDefined();
    const lastX = run.start + (run.count - 1) * run.step;
    expect(ticks.domain.min).toBe(run.start);
    for (const width of WIDTHS) {
      expect(sceneTicks(ticks, width), `at ${width}px`).toEqual(
        elasticTicks(
          ticks,
          run.mark === 'bar',
          lastX,
          run.timeZone,
          run.locale,
          width
        )
      );
    }
  });
});
