/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode } from './schema';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 9, 1);

/** One tile: a value, its change from the previous period and a trend. */
export const example: MetricNode = {
  type: 'metric',
  tiles: [
    {
      key: 'requests',
      title: 'Requests',
      subtitle: 'Last 24 hours',
      value: 182_340,
      format: { kind: 'number', decimals: 0 },
      color: 'primary',
      secondary: {
        kind: 'change',
        label: 'vs previous day',
        previous: 164_120,
        increase: 'good',
      },
      visual: {
        kind: 'trend',
        points: [9.1, 8.4, 7.9, 8.8, null, 10.2, 11.6, 12.4].map(
          (y, index) => ({
            x: START + index * HOUR,
            y: y === null ? null : y * 1000,
          })
        ),
      },
    },
  ],
};

/** A breakdown: one tile per host, colored by status, each raising a filter action. */
export const breakdownExample: MetricNode = {
  type: 'metric',
  columns: 3,
  tiles: [
    ['web-01', 0.42, 'success'],
    ['web-02', 0.81, 'warning'],
    ['web-03', 0.97, 'danger'],
  ].map(([host, cpu, color]) => ({
    key: host as string,
    title: host as string,
    subtitle: 'CPU',
    value: cpu as number,
    format: { kind: 'percent', decimals: 1 },
    color: color as 'success' | 'warning' | 'danger',
    action: {
      name: 'dashboard/filter',
      filters: [{ field: 'host.name', value: host as string }],
    },
  })),
};

/** Progress toward a maximum, with a resolved secondary value in a badge. */
export const progressExample: MetricNode = {
  type: 'metric',
  layout: {
    titleAlign: 'center',
    valueAlign: 'center',
    secondaryAlign: 'center',
    valuePosition: 'middle',
  },
  tiles: [
    {
      key: 'disk',
      title: 'Disk used',
      value: 412_316_860_416,
      format: { kind: 'bytes', decimals: 1 },
      secondary: {
        kind: 'value',
        label: 'Quota',
        value: 549_755_813_888,
        format: { kind: 'bytes', decimals: 0 },
        badge: { color: 'default' },
      },
      visual: {
        kind: 'progress',
        max: 549_755_813_888,
        direction: 'horizontal',
      },
    },
  ],
};

/** A text reading beside a missing one, painting the value instead of the tile. */
export const textExample: MetricNode = {
  type: 'metric',
  tiles: [
    {
      key: 'top-country',
      title: 'Top country',
      value: 'Portugal',
      color: '#A6EDEA',
    },
    {
      key: 'p99',
      title: 'p99 latency',
      value: null,
      format: { kind: 'number', decimals: 1, suffix: ' ms' },
      color: 'danger',
      colorTarget: 'value',
    },
  ],
};

export const examples: MetricNode[] = [
  example,
  breakdownExample,
  progressExample,
  textExample,
];
