/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricTrendModel } from './model';

const start = Date.UTC(2026, 9, 14, 8);
/**
 * Synthetic authoring/Studio fixtures covering comparisons, missing readings,
 * progress, aligned trends and collapse. These are not captured Lens results.
 */
export const metricExamples: MetricTrendModel[] = [
  {
    type: 'metricTrend',
    title: 'Requests',
    tiles: [
      {
        key: 'requests',
        primary: { label: 'Requests', value: 110 },
        secondary: {
          label: 'Yesterday',
          value: 100,
          comparison: { baseline: 'primary', display: 'both' },
        },
        trend: {
          primary: [
            { time: start, value: 80 },
            { time: start + 3600000, value: null },
            { time: start + 7200000, value: 110 },
          ],
          timeZone: 'UTC',
        },
        action: {
          label: 'Inspect requests',
          event: { name: 'inspect', context: { metric: 'requests' } },
        },
      },
    ],
  },
  {
    type: 'metricTrend',
    title: 'Service health',
    layout: { columns: 2, minTiles: 3 },
    tiles: [
      {
        key: 'checkout',
        title: 'Checkout',
        primary: {
          label: 'Availability',
          value: 0.998,
          format: { style: 'percent', precision: 1 },
        },
        secondary: {
          label: 'Error change',
          value: -0.02,
          format: { style: 'percent' },
          comparison: { baseline: 0, display: 'value', increase: 'bad' },
        },
        tone: 'good',
        progress: { max: 1, direction: 'horizontal', label: 'SLO' },
      },
      {
        key: 'search',
        title: 'Search',
        primary: {
          label: 'Availability',
          value: null,
          format: { style: 'percent' },
        },
      },
    ],
  },
  {
    type: 'metricTrend',
    title: 'Aligned trends',
    layout: {
      valueFont: 'fit',
      primaryPosition: 'top',
      titleAlign: 'right',
      primaryAlign: 'right',
    },
    tiles: [
      {
        key: 'latency',
        primary: {
          label: 'Latency',
          value: 150,
          format: { style: 'duration', unit: 'ms' },
        },
        secondary: {
          label: 'Previous latency',
          value: 180,
          labelPosition: 'after',
          comparison: {
            baseline: 'primary',
            display: 'absolute',
            increase: 'bad',
          },
        },
        trend: {
          primary: [
            { time: start, value: 200 },
            { time: start + 3600000, value: 150 },
            { time: start + 7200000, value: 150 },
          ],
          secondary: [
            { time: start, value: 180 },
            { time: start + 7200000, value: 180 },
          ],
          timeZone: 'America/New_York',
          gap: 'gap',
        },
      },
    ],
  },
  {
    type: 'metricTrend',
    title: 'Collapsed requests',
    collapse: { operation: 'sum', label: 'All services', max: 'static' },
    tiles: [10, 20].map((value, i) => ({
      key: `service-${i}`,
      primary: { label: 'Requests', value },
      progress: { max: 100 },
    })),
  },
];
