/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-written Scenes for schema examples, so renderers can be built
// against the contract before the resolver exists. They show the shape, not
// expected output: tests compare a resolver against Kibana, never against these.

import type { Cell } from '../schema/data';

import type {
  MetricScene,
  SceneChrome,
  SceneSelection,
  XyMark,
  XyScene,
  XySeries,
} from './types';

const lightChrome: SceneChrome = {
  text: '#384861',
  textSubdued: '#516381',
  axis: '#CAD3E2',
  gridLine: '#E3E8F2',
  background: '#FFFFFF',
  border: '#CAD3E2',
};

/** The Scene for the `metric` example "Single value", in light. */
export const metricSingleValueScene: MetricScene = {
  kind: 'metric',
  scheme: 'light',
  size: { width: 240, height: 160 },
  locale: 'en',
  timeZone: 'UTC',
  title: 'Requests',
  chrome: lightChrome,
  summary: 'Requests: Count of records is 14,074.',
  table: {
    columns: [
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
        empty: false,
      },
    ],
    rows: [{ row: 0, cells: ['14,074'], values: [14_074] }],
  },
  interactions: {
    select: [],
    sync: { cursor: false, tooltips: false },
    emphasis: [],
  },
  layout: {
    columns: 1,
    rows: 1,
    density: 'default',
    valuePosition: 'bottom',
    labelsAlignment: 'left',
    valueAlignment: 'right',
    valueSizing: 'auto',
    secondaryAlignment: 'right',
  },
  tiles: [
    {
      source: { rows: [0], columns: ['count'] },
      title: 'Count of records',
      value: { text: '14,074', raw: 14_074, color: '#384861' },
      background: '#FFFFFF',
      tooltip: { entries: [{ label: 'Count of records', value: '14,074' }] },
      description: 'Count of records: 14,074',
    },
  ],
};

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);
const counts = [120, 98, 143, 210, 187, 164];
const hourLabel = (index: number) => `0${index}:00`;

/** The Scene for the `xyChart` example "Time series line", in light. */
export const xyTimeSeriesScene: XyScene = {
  kind: 'xy',
  scheme: 'light',
  size: { width: 480, height: 240 },
  locale: 'en',
  timeZone: 'UTC',
  title: 'Requests over time',
  chrome: lightChrome,
  summary:
    'Requests over time: Count of records by @timestamp per hour, from 98 to 210.',
  table: {
    columns: [
      {
        id: 'time',
        label: '@timestamp per hour',
        type: 'date',
        role: 'dimension',
        empty: false,
      },
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
        empty: false,
      },
    ],
    rows: counts.map((count, index) => ({
      row: index,
      cells: [hourLabel(index), String(count)],
      values: [START + index * HOUR, count],
    })),
  },
  interactions: {
    select: [],
    sync: { cursor: false, tooltips: false },
    emphasis: [],
  },
  orientation: 'vertical',
  categories: counts.map((_, index) => ({
    x: START + index * HOUR,
    label: hourLabel(index),
  })),
  axes: {
    x: {
      id: 'x',
      position: 'bottom',
      scale: 'time',
      domain: [START, START + 5 * HOUR],
      ticks: counts.map((_, index) => ({
        value: START + index * HOUR,
        label: hourLabel(index),
      })),
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
    y: {
      id: 'y',
      position: 'left',
      scale: 'linear',
      domain: [0, 250],
      ticks: [0, 50, 100, 150, 200, 250].map((value) => ({
        value,
        label: String(value),
      })),
      title: 'Count of records',
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
  },
  layers: [
    {
      kind: 'series',
      series: {
        series: { layer: 0, y: 0 },
        key: 'count',
        label: 'Count of records',
        mark: 'line',
        axis: 'y',
        color: '#16C5C0',
        interpolation: 'linear',
        fitting: { kind: 'none', emphasize: false, extend: 'none' },
        showPoints: true,
        areaOpacity: 0.3,
        areaFill: 'solid',
        valueLabels: false,
        source: { rows: [0, 1, 2, 3, 4, 5], columns: ['time', 'count'] },
        marks: counts.map((count, index) => ({
          source: { rows: [index], columns: ['time', 'count'] },
          x: START + index * HOUR,
          y: count,
          label: String(count),
          tooltip: {
            header: hourLabel(index),
            entries: [
              {
                label: 'Count of records',
                value: String(count),
                color: '#16C5C0',
              },
            ],
          },
          description: `@timestamp per hour: ${hourLabel(index)} · Count of records: ${count}`,
        })),
      },
    },
  ],
  legend: {
    visible: false,
    position: 'right',
    layout: 'grid',
    maxLines: 1,
    size: 'auto',
    items: [
      {
        series: { layer: 0, y: 0 },
        key: 'count',
        label: 'Count of records',
        color: '#16C5C0',
        hidden: false,
        statistics: [],
        source: { rows: [0, 1, 2, 3, 4, 5], columns: ['time', 'count'] },
        description: 'Count of records',
      },
    ],
  },
  barMinimumHeight: 1,
};

const TIME_LABEL = '@timestamp per hour';
const STATUS_LABEL = 'Top 2 values of response.code';
const COUNT_LABEL = 'Count of records';

/** Series of the `xyChart` example "Interactive stacked bars", in draw order. */
const statuses: readonly {
  key: string;
  raw: Cell;
  label: string;
  color: string;
  counts: readonly number[];
}[] = [
  {
    key: '200',
    raw: '200',
    label: '200',
    color: '#16C5C0',
    counts: [802, 911, 870],
  },
  {
    key: '404',
    raw: '404',
    label: '404',
    color: '#61A2FF',
    counts: [41, 37, 52],
  },
  {
    key: 'Other',
    raw: 'Other',
    label: 'Other',
    color: '#BFDBFF',
    counts: [12, 9, 15],
  },
  {
    key: '\\null',
    raw: null,
    label: '(null)',
    color: '#EE72A6',
    counts: [3, 0, 1],
  },
];

/** The row of `xyInteractive` for an hour and a status: four rows per hour. */
const rowOf = (hour: number, status: number) => hour * 4 + status;

const interactiveHours = [0, 1, 2];

const interactiveSeries: XySeries[] = statuses.map(
  ({ key, raw, label, color, counts: values }, status) => {
    const rows = interactiveHours.map((hour) => rowOf(hour, status));
    const selection = (
      target: 'series' | 'legend'
    ): Extract<SceneSelection, { target: 'series' | 'legend' }> => ({
      target,
      rows,
      columns: ['status'],
      values: { status: raw },
      description: `${STATUS_LABEL}: ${label}`,
      series: { layer: 0, y: 0 },
      seriesKey: key,
    });
    const marks: XyMark[] = interactiveHours.map((hour) => {
      const below = statuses
        .slice(0, status)
        .reduce((sum, { counts: other }) => sum + (other[hour] ?? 0), 0);
      const value = values[hour] ?? 0;
      const description = `${TIME_LABEL}: ${hourLabel(hour)} · ${STATUS_LABEL}: ${label} · ${COUNT_LABEL}: ${value}`;
      return {
        source: {
          rows: [rowOf(hour, status)],
          columns: ['time', 'status', 'count'],
        },
        x: START + hour * HOUR,
        y: below + value,
        y0: below,
        label: String(value),
        tooltip: {
          header: hourLabel(hour),
          entries: [{ label, value: String(value), color }],
        },
        description,
        selection: {
          target: 'datum',
          rows: [rowOf(hour, status)],
          columns: ['time', 'status'],
          values: { time: START + hour * HOUR, status: raw },
          description,
          series: { layer: 0, y: 0 },
          seriesKey: key,
        },
      };
    });
    return {
      series: { layer: 0, y: 0 },
      key,
      label,
      mark: 'bar',
      axis: 'y',
      color,
      stack: { group: 'y', mode: 'stacked' },
      interpolation: 'linear',
      fitting: { kind: 'none', emphasize: false, extend: 'none' },
      showPoints: false,
      areaOpacity: 0.3,
      areaFill: 'solid',
      valueLabels: false,
      source: { rows, columns: ['time', 'status', 'count'] },
      selection: selection('series'),
      marks,
    };
  }
);

/**
 * The Scene for the `xyChart` example "Interactive stacked bars", in light.
 * Its selections are the ones `chartEventExamples` raise.
 */
export const xyInteractiveScene: XyScene = {
  kind: 'xy',
  scheme: 'light',
  size: { width: 480, height: 240 },
  locale: 'en',
  timeZone: 'UTC',
  title: 'Responses by status',
  chrome: lightChrome,
  summary: `Responses by status: ${COUNT_LABEL} by ${TIME_LABEL} and ${STATUS_LABEL}, from 0 to 911.`,
  table: {
    columns: [
      {
        id: 'time',
        label: TIME_LABEL,
        type: 'date',
        role: 'dimension',
        empty: false,
      },
      {
        id: 'status',
        label: STATUS_LABEL,
        type: 'string',
        role: 'dimension',
        empty: false,
      },
      {
        id: 'count',
        label: COUNT_LABEL,
        type: 'number',
        role: 'metric',
        empty: false,
      },
    ],
    rows: interactiveHours.flatMap((hour) =>
      statuses.map(({ label, counts: values }, status) => ({
        row: rowOf(hour, status),
        cells: [hourLabel(hour), label, String(values[hour] ?? 0)],
        values: [
          START + hour * HOUR,
          statuses[status]?.raw ?? null,
          values[hour] ?? 0,
        ],
      }))
    ),
  },
  interactions: {
    select: ['datum', 'series', 'category', 'legend'],
    brush: { column: 'time' },
    sync: { cursor: true, tooltips: true },
    link: {
      href: 'https://kibana.example.com/app/lens#/edit/b2f4f8a0-1d2c-11ee-9f1a-0b2e5c1e7d3a',
      label: 'Open in Kibana',
    },
    emphasis: [{ rows: [5], note: '404s peak at 01:00' }],
  },
  orientation: 'vertical',
  axes: {
    x: {
      id: 'x',
      position: 'bottom',
      scale: 'time',
      domain: [START, START + 2 * HOUR],
      ticks: interactiveHours.map((hour) => ({
        value: START + hour * HOUR,
        label: hourLabel(hour),
      })),
      showTicks: true,
      showGrid: false,
      labelRotation: 0,
    },
    y: {
      id: 'y',
      position: 'left',
      scale: 'linear',
      domain: [0, 1000],
      ticks: [0, 200, 400, 600, 800, 1000].map((value) => ({
        value,
        label: value.toLocaleString('en'),
      })),
      title: COUNT_LABEL,
      showTicks: true,
      showGrid: true,
      labelRotation: 0,
    },
  },
  categories: interactiveHours.map((hour) => ({
    x: START + hour * HOUR,
    label: hourLabel(hour),
    selection: {
      target: 'category',
      rows: statuses.map((_, status) => rowOf(hour, status)),
      columns: ['time'],
      values: { time: START + hour * HOUR },
      description: `${TIME_LABEL}: ${hourLabel(hour)}`,
    },
  })),
  layers: interactiveSeries.map((series) => ({ kind: 'series', series })),
  legend: {
    visible: true,
    position: 'right',
    layout: 'list',
    maxLines: 1,
    size: 'auto',
    items: interactiveSeries.map(
      ({ key, label, color, source, selection }) => ({
        series: { layer: 0, y: 0 },
        key,
        label,
        color,
        hidden: key === '\\null',
        statistics: [],
        source,
        description: `${STATUS_LABEL}: ${label}`,
        ...(selection?.target === 'series'
          ? { selection: { ...selection, target: 'legend' as const } }
          : {}),
      })
    ),
  },
  barMinimumHeight: 1,
};
