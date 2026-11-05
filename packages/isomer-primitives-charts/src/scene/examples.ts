/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-written Scenes for two of the schema examples, so renderers can be built
// against the contract before the resolver exists. They show the shape, not
// expected output: tests compare a resolver against Kibana, never against these.

import type { MetricScene, SceneChrome, XyScene } from './types';

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
    rows: [{ row: 0, cells: ['14,074'] }],
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
    })),
  },
  orientation: 'vertical',
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
