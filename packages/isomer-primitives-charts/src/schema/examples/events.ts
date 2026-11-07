/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartEvent } from '../events';

import { xyInteractive } from './xy_chart';

// Rows of `xyInteractive`: four per hour from 00:00, in the order 200, 404,
// Other, missing.
const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);

interface ChartEventExample {
  name: string;
  description: string;
  event: ChartEvent;
}

/** Events raised on {@link xyInteractive}, as every renderer must raise them. */
export const chartEventExamples: ChartEventExample[] = [
  {
    name: 'Select a bar segment',
    description: 'A click on the 404 segment at 00:00.',
    event: {
      kind: 'select',
      node: xyInteractive.id ?? '',
      target: 'datum',
      rows: [1],
      columns: ['time', 'status'],
      series: { layer: 0, y: 0 },
      seriesKey: '404',
      values: { time: START, status: '404' },
      description:
        '@timestamp per hour: 00:00 · Top 2 values of response.code: 404 · Count of records: 41',
    },
  },
  {
    name: 'Select the missing bucket',
    description: 'A click on the missing (null) segment at 00:00.',
    event: {
      kind: 'select',
      node: xyInteractive.id ?? '',
      target: 'datum',
      rows: [3],
      columns: ['time', 'status'],
      series: { layer: 0, y: 0 },
      seriesKey: '\\null',
      values: { time: START, status: null },
      description:
        '@timestamp per hour: 00:00 · Top 2 values of response.code: (null) · Count of records: 3',
    },
  },
  {
    name: 'Filter out a legend item',
    description:
      'A "filter out" on the Other legend item: every row of the series.',
    event: {
      kind: 'select',
      node: xyInteractive.id ?? '',
      target: 'legend',
      rows: [2, 6, 10],
      columns: ['status'],
      series: { layer: 0, y: 0 },
      seriesKey: 'Other',
      values: { status: 'Other' },
      negate: true,
      description: 'Top 2 values of response.code: Other',
    },
  },
  {
    name: 'Select an x category',
    description: 'A click on the 01:00 tick: every row at that time.',
    event: {
      kind: 'select',
      node: xyInteractive.id ?? '',
      target: 'category',
      rows: [4, 5, 6, 7],
      columns: ['time'],
      values: { time: START + HOUR },
      description: '@timestamp per hour: 01:00',
    },
  },
  {
    name: 'Brush a time range',
    description: 'A drag across the first two hours.',
    event: {
      kind: 'brush',
      node: xyInteractive.id ?? '',
      column: 'time',
      range: [START, START + 2 * HOUR],
      values: {},
      description: '@timestamp per hour: 00:00 to 02:00',
    },
  },
];
