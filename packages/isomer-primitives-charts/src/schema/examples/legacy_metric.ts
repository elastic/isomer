/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { ChartColumn } from '../data';
import type { LegacyMetricNode } from '../legacy_metric';

import { BYTES, NUMBER, PERCENT } from './shared';

const COUNT: ChartColumn = {
  id: 'count',
  label: 'Count of records',
  type: 'number',
  role: 'metric',
  format: NUMBER,
};

const dimension = (id: string, label: string): ChartColumn => ({
  id,
  label,
  type: 'string',
  role: 'dimension',
});

// Lens's default custom palette steps, light and dark alike.
const GOOD = { light: '#209280', dark: '#209280' };
const FAIR = { light: '#D6BF57', dark: '#D6BF57' };
const POOR = { light: '#CC5642', dark: '#CC5642' };

/** The smallest `legacyMetric`: one value from one row. The catalog's example. */
export const legacyMetricSingleValue: LegacyMetricNode = {
  type: 'legacyMetric',
  title: 'Requests',
  data: { columns: [COUNT], rows: [[14_074]] },
  metrics: [{ column: 'count' }],
};

/** Named `legacyMetric` examples covering the corpus edge cases, each valid in a composition. */
export const legacyMetricExamples: PrimitiveExample<LegacyMetricNode>[] = [
  {
    name: 'Single value',
    description:
      'One number at the default size, its label above, aligned left.',
    node: legacyMetricSingleValue,
  },
  {
    name: 'Background by bands',
    description:
      'A lone value whose band color fills the chart, extra large, centered, with its label below.',
    node: {
      type: 'legacyMetric',
      title: 'Error rate',
      data: {
        columns: [
          {
            id: 'rate',
            label: 'Error rate',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
        ],
        rows: [[0.072]],
      },
      metrics: [{ column: 'rate' }],
      size: 'xl',
      labelPosition: 'bottom',
      textAlign: 'center',
      colors: {
        bands: [
          { to: 0.02, color: GOOD },
          { from: 0.02, to: 0.05, color: FAIR },
          { from: 0.05, color: POOR },
        ],
      },
    },
  },
  {
    name: 'Values colored by percentage bands across a breakdown',
    description:
      'One tile per host, including the Other bucket and a missing (null) bucket, each value’s text colored by where it falls between the least and greatest.',
    node: {
      type: 'legacyMetric',
      title: 'Memory used by host',
      data: {
        columns: [
          dimension('host', 'host.name'),
          {
            id: 'used',
            label: 'Memory used',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
        ],
        rows: [
          ['web-01', 412_000_000_000],
          ['web-02', 98_000_000_000],
          ['Other', 1_250_000_000_000],
          [null, 3_000_000],
        ],
      },
      metrics: [{ column: 'used' }],
      breakdown: { column: 'host' },
      size: 's',
      applyColorTo: 'value',
      bandsRange: 'percentage',
      colors: {
        bands: [
          { to: 33, color: GOOD },
          { from: 33, to: 66, color: FAIR },
          { from: 66, color: POOR },
        ],
      },
    },
  },
  {
    name: 'Several metrics',
    description:
      'Three columns of one row, each its own tile, labels below and right-aligned.',
    node: {
      type: 'legacyMetric',
      title: 'Traffic',
      data: {
        columns: [
          COUNT,
          {
            id: 'bytes',
            label: 'Sum of bytes',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
          {
            id: 'visitors',
            label: 'Unique visitors',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [[14_074, 82_400_000_000, 3_212]],
      },
      metrics: [
        { column: 'count' },
        { column: 'bytes' },
        { column: 'visitors' },
      ],
      labelPosition: 'bottom',
      textAlign: 'right',
    },
  },
  {
    name: 'Several metrics by breakdown, backgrounds by bands',
    description:
      'Two columns across three regions: every row of the first column, then of the second, each tile’s background its band’s color.',
    node: {
      type: 'legacyMetric',
      title: 'Latency by region',
      data: {
        columns: [
          dimension('region', 'cloud.region'),
          {
            id: 'p50',
            label: 'Median latency',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'duration',
              input: 'milliseconds',
              output: 'milliseconds',
              unitDisplay: 'short',
            },
          },
          {
            id: 'p99',
            label: '99th percentile latency',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'duration',
              input: 'milliseconds',
              output: 'milliseconds',
              unitDisplay: 'short',
            },
          },
        ],
        rows: [
          ['us-east-1', 42, 180],
          ['eu-west-1', 61, 420],
          ['ap-south-1', 95, 910],
        ],
      },
      metrics: [{ column: 'p50' }, { column: 'p99' }],
      breakdown: { column: 'region' },
      size: 'xs',
      textAlign: 'center',
      colors: {
        bands: [
          { to: 100, color: GOOD },
          { from: 100, to: 500, color: FAIR },
          { from: 500, color: POOR },
        ],
      },
    },
  },
  {
    name: 'Text, dates and a missing value',
    description:
      'A string, a date and a missing number: bands color none of them, and the missing value shows as the empty-value text.',
    node: {
      type: 'legacyMetric',
      title: 'Last deploy',
      data: {
        columns: [
          dimension('version', 'Latest version'),
          {
            id: 'at',
            label: 'Deployed at',
            type: 'date',
            role: 'metric',
            format: {
              kind: 'date',
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'UTC',
            },
          },
          COUNT,
        ],
        rows: [['9.3.0', Date.UTC(2026, 10, 3, 14, 30), null]],
      },
      metrics: [{ column: 'version' }, { column: 'at' }, { column: 'count' }],
      colors: { bands: [{ from: 0, color: GOOD }] },
    },
  },
  {
    name: 'Labels hidden, shrunk to fit',
    description:
      'A long value at the largest size with no label: the tile shrinks to fit the chart.',
    node: {
      type: 'legacyMetric',
      title: 'Bytes transferred',
      data: {
        columns: [
          {
            id: 'bytes',
            label: 'Sum of bytes',
            type: 'number',
            role: 'metric',
            format: { kind: 'number', maximumFractionDigits: 0 },
          },
        ],
        rows: [[98_765_432_109_876]],
      },
      metrics: [{ column: 'bytes' }],
      size: 'xxl',
      showLabels: false,
    },
  },
  {
    name: 'No rows',
    description: 'No data: the chart says there are no results.',
    node: {
      type: 'legacyMetric',
      title: 'Requests by host',
      data: { columns: [dimension('host', 'host.name'), COUNT], rows: [] },
      metrics: [{ column: 'count' }],
      breakdown: { column: 'host' },
    },
  },
  {
    name: 'Selectable, pre-rendered and with provenance',
    description:
      'Tiles a reader can select, names pre-rendered by the host, an emphasized tile with a note, a link, provenance and a recorded loss.',
    node: {
      type: 'legacyMetric',
      title: 'Alerts by rule',
      description: 'Alerts fired in the last 24 hours, by rule.',
      data: {
        columns: [
          {
            ...dimension('rule', 'kibana.alert.rule.uuid'),
            source: { field: 'kibana.alert.rule.uuid' },
          },
          COUNT,
        ],
        rows: [
          ['a1', 142],
          ['b2', 87],
          ['c3', 51],
        ],
        display: { rule: ['High CPU', 'Disk almost full', 'Error spike'] },
      },
      metrics: [{ column: 'count' }],
      breakdown: { column: 'rule' },
      labelPosition: 'bottom',
      interactions: {
        select: ['tile'],
        link: {
          label: 'Open in Kibana',
          href: 'https://kibana.example.com/app/observability/alerts',
        },
      },
      emphasis: [{ rows: [1], note: 'Disk alerts doubled since yesterday.' }],
      source: {
        host: 'kibana',
        hostVersion: '9.3.0',
        capturedAt: '2026-11-03T12:00:00Z',
      },
      losses: [
        {
          path: 'data.display.rule',
          kind: 'prerendered',
          note: 'Rule ids are shown by their names, from a lookup.',
        },
      ],
    },
  },
];
