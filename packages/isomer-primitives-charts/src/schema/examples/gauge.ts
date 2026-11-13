/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { ChartColumn } from '../data';
import type { GaugeNode } from '../gauge';

import { NUMBER } from './shared';

const metric = (
  id: string,
  label: string,
  format: ChartColumn['format'] = NUMBER
): ChartColumn => ({
  id,
  label,
  type: 'number',
  role: 'metric',
  ...(format ? { format } : {}),
});

const PERCENT_WHOLE: ChartColumn['format'] = {
  kind: 'percent',
  fractional: false,
  maximumFractionDigits: 0,
};

const GREEN = { light: '#24C292', dark: '#24C292' };
const YELLOW = { light: '#FCD883', dark: '#EAAE01' };
const RED = { light: '#F6726A', dark: '#F6726A' };

/** A semicircle gauge with bands, a goal and band ticks. The catalog's example. */
export const gaugeSemiCircle: GaugeNode = {
  type: 'gauge',
  title: 'CPU utilization',
  shape: 'semiCircle',
  data: {
    columns: [
      metric('cpu', 'Mean CPU', PERCENT_WHOLE),
      metric('min', 'Minimum', PERCENT_WHOLE),
      metric('max', 'Maximum', PERCENT_WHOLE),
      metric('goal', 'Target', PERCENT_WHOLE),
    ],
    rows: [[72, 0, 100, 80]],
  },
  value: { column: 'cpu' },
  min: { column: 'min' },
  max: { column: 'max' },
  goal: { column: 'goal' },
  colors: {
    bands: [
      { from: 0, to: 60, color: GREEN },
      { from: 60, to: 85, color: YELLOW },
      { from: 85, to: 100, color: RED },
    ],
  },
  ticks: 'bands',
};

/** Named `gauge` examples covering the corpus edge cases, each valid in a composition. */
export const gaugeExamples: PrimitiveExample<GaugeNode>[] = [
  {
    name: 'Semicircle with bands and a goal',
    description:
      'A semicircle from 0 to 100% in three bands, a goal marker, and ticks at the band edges.',
    node: gaugeSemiCircle,
  },
  {
    name: 'Horizontal bullet',
    description:
      'A bullet with no bounds or bands: the scale runs from 0 to the value rounded up, in one neutral color, with a subtitle.',
    node: {
      type: 'gauge',
      title: 'Requests today',
      shape: 'horizontalBullet',
      data: {
        columns: [metric('requests', 'Count of records')],
        rows: [[8_412]],
      },
      value: { column: 'requests' },
      labels: { minor: 'Since midnight UTC' },
    },
  },
  {
    name: 'Vertical bullet with percentage bands',
    description:
      'Bands as percentages of the scale, and no ticks, on a vertical bullet.',
    node: {
      type: 'gauge',
      title: 'Disk used',
      shape: 'verticalBullet',
      data: {
        columns: [
          metric('used', 'Used', { kind: 'bytes', maximumFractionDigits: 1 }),
          metric('capacity', 'Capacity', {
            kind: 'bytes',
            maximumFractionDigits: 1,
          }),
        ],
        rows: [[412_316_860_416, 536_870_912_000]],
      },
      value: { column: 'used' },
      max: { column: 'capacity' },
      bandsRange: 'percentage',
      colors: {
        bands: [
          { from: 0, to: 70, color: GREEN },
          { from: 70, to: 90, color: YELLOW },
          { from: 90, color: RED },
        ],
      },
      ticks: 'hidden',
    },
  },
  {
    name: 'Arc with gaps between bands',
    description:
      'Bands that leave parts of the scale uncovered, drawn transparent, and no title.',
    node: {
      type: 'gauge',
      shape: 'arc',
      data: {
        columns: [
          metric('latency', 'p95 latency', { kind: 'number', suffix: ' ms' }),
          metric('max', 'Budget', { kind: 'number', suffix: ' ms' }),
        ],
        rows: [[340, 600]],
      },
      value: { column: 'latency' },
      max: { column: 'max' },
      colors: {
        bands: [
          { from: 0, to: 200, color: GREEN },
          { from: 400, to: 600, color: RED },
        ],
      },
      labels: { major: false },
    },
  },
  {
    name: 'Circle, pre-rendered and with provenance',
    description:
      'A full circle whose value is pre-rendered by the host, with a link, provenance and a recorded loss.',
    node: {
      type: 'gauge',
      title: 'SLO budget remaining',
      description: 'Error budget left this month.',
      shape: 'circle',
      data: {
        columns: [
          {
            ...metric('budget', 'Budget remaining', PERCENT_WHOLE),
            source: { field: 'slo.budget.remaining' },
          },
          metric('min', 'Minimum', PERCENT_WHOLE),
          metric('max', 'Maximum', PERCENT_WHOLE),
        ],
        rows: [[38, 0, 100]],
        display: { budget: ['38 % left'] },
      },
      value: { column: 'budget' },
      min: { column: 'min' },
      max: { column: 'max' },
      colors: {
        bands: [
          { from: 0, to: 25, color: RED },
          { from: 25, color: GREEN },
        ],
      },
      interactions: {
        link: {
          label: 'Open in Kibana',
          href: 'https://kibana.example.com/app/slo/checkout-availability',
        },
      },
      source: {
        host: 'kibana',
        hostVersion: '9.3.0',
        capturedAt: '2026-11-03T12:00:00Z',
      },
      losses: [
        {
          path: 'data.display.budget',
          kind: 'prerendered',
          note: 'The budget uses a custom field format.',
        },
      ],
    },
  },
  {
    name: 'Negative value',
    description:
      'A value below zero: with no stated minimum the scale starts 10 below it, as Lens does.',
    node: {
      type: 'gauge',
      title: 'Net change',
      shape: 'horizontalBullet',
      data: { columns: [metric('change', 'Net change')], rows: [[-25]] },
      value: { column: 'change' },
    },
  },
  {
    name: 'Huge value',
    description:
      'A value in the trillions, in compact notation, on a scale rounded up from it.',
    node: {
      type: 'gauge',
      title: 'Events ingested',
      shape: 'semiCircle',
      data: {
        columns: [
          metric('events', 'Events', {
            kind: 'number',
            notation: 'compact',
            maximumFractionDigits: 1,
          }),
        ],
        rows: [[3_480_000_000_000]],
      },
      value: { column: 'events' },
    },
  },
  {
    name: 'No value',
    description: 'A missing value: the gauge says there are no results.',
    node: {
      type: 'gauge',
      title: 'Queue depth',
      shape: 'arc',
      data: { columns: [metric('depth', 'Queue depth')], rows: [[null]] },
      value: { column: 'depth' },
    },
  },
  {
    name: 'Minimum above maximum',
    description:
      'Bounds the wrong way round: the gauge says so instead of drawing.',
    node: {
      type: 'gauge',
      title: 'Misconfigured',
      shape: 'semiCircle',
      data: {
        columns: [
          metric('value', 'Value'),
          metric('min', 'Minimum'),
          metric('max', 'Maximum'),
        ],
        rows: [[50, 100, 10]],
      },
      value: { column: 'value' },
      min: { column: 'min' },
      max: { column: 'max' },
    },
  },
];
