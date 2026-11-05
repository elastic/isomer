/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { PortableFormat } from '../format';
import type { MetricNode } from '../metric';

import { BYTES, HOUR, NUMBER, PERCENT, START } from './shared';

const DATE: PortableFormat = {
  kind: 'date',
  pattern: 'MMM D, YYYY @ HH:mm:ss.SSS',
  timeZone: 'UTC',
};

/** The smallest `metric`: one value from one row. The catalog's example. */
export const metricSingleValue: MetricNode = {
  type: 'metric',
  title: 'Requests',
  data: {
    columns: [
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
        format: NUMBER,
      },
    ],
    rows: [[14_074]],
  },
  value: { column: 'count' },
};

/** Named `metric` examples covering the corpus edge cases, each valid in a composition. */
export const metricExamples: PrimitiveExample<MetricNode>[] = [
  {
    name: 'Single value',
    description: 'One number, formatted with Kibana’s default number pattern.',
    node: metricSingleValue,
  },
  {
    name: 'Compared to the primary value',
    description:
      'A secondary value shown as its difference from the primary value, colored by sign.',
    node: {
      type: 'metric',
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
          {
            id: 'previous',
            label: 'Last week',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
        ],
        rows: [[0.021, 0.034]],
      },
      value: { column: 'rate', subtitle: 'Past 24 hours' },
      secondary: {
        column: 'previous',
        showLabel: true,
        labelPlacement: 'before',
        compare: {
          to: 'primary',
          showIcon: true,
          showValue: true,
          colors: {
            increase: { light: '#E7664C', dark: '#E7664C' },
            decrease: { light: '#54B399', dark: '#54B399' },
            neutral: { token: 'textSubdued' },
          },
        },
      },
    },
  },
  {
    name: 'Breakdown with Other and missing buckets',
    description:
      'One tile per row, including the Other bucket and a missing (null) bucket, colored by percentage bands of each tile’s maximum.',
    node: {
      type: 'metric',
      title: 'Disk used by host',
      data: {
        columns: [
          {
            id: 'host',
            label: 'host.name',
            type: 'string',
            role: 'dimension',
          },
          {
            id: 'used',
            label: 'Used',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
          {
            id: 'capacity',
            label: 'Capacity',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
        ],
        rows: [
          ['web-01', 412_000_000_000, 500_000_000_000],
          ['web-02', 98_000_000_000, 500_000_000_000],
          ['Other', 1_250_000_000_000, 4_000_000_000_000],
          [null, 3_000_000, 500_000_000_000],
        ],
      },
      colors: {
        bands: [
          { to: 60, color: { light: '#54B399', dark: '#54B399' } },
          { from: 60, to: 80, color: { light: '#D6BF57', dark: '#D6BF57' } },
          { from: 80, color: { light: '#E7664C', dark: '#E7664C' } },
        ],
      },
      value: {
        column: 'used',
        color: 'bands',
        bandsRange: 'percentage',
        applyColorTo: 'background',
      },
      background: { kind: 'bar', max: 'capacity', orientation: 'horizontal' },
      breakdown: { column: 'host', maxColumns: 2 },
    },
  },
  {
    name: 'Trend line',
    description: 'A trend line from its own table behind the value.',
    node: {
      type: 'metric',
      title: 'Average response time',
      data: {
        columns: [
          {
            id: 'avg',
            label: 'Average of response.time',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'duration',
              input: 'milliseconds',
              output: 'humanizePrecise',
              decimals: 1,
              useShortSuffix: true,
            },
          },
        ],
        rows: [[233.7]],
      },
      value: { column: 'avg' },
      background: {
        kind: 'trend',
        data: {
          columns: [
            {
              id: 'time',
              label: '@timestamp',
              type: 'date',
              role: 'dimension',
              format: DATE,
            },
            {
              id: 'avg',
              label: 'Average of response.time',
              type: 'number',
              role: 'metric',
            },
          ],
          rows: [
            [START, 210.2],
            [START + HOUR, 245.9],
            [START + 2 * HOUR, null],
            [START + 3 * HOUR, 233.7],
          ],
        },
        x: 'time',
        y: 'avg',
      },
    },
  },
  {
    name: 'Huge, tiny and negative values',
    description:
      'Values at the extremes of the number format, one tile each, with a static color for each scheme.',
    node: {
      type: 'metric',
      data: {
        columns: [
          {
            id: 'case',
            label: 'Case',
            type: 'string',
            role: 'dimension',
          },
          {
            id: 'value',
            label: 'Value',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [
          ['Huge', 9_007_199_254_740_991],
          ['Tiny', 0.000_000_012],
          ['Negative', -42_517.25],
          ['Zero', 0],
        ],
      },
      value: {
        column: 'value',
        color: { light: '#0B64DD', dark: '#61A2FF' },
        applyColorTo: 'value',
      },
      breakdown: { column: 'case', maxColumns: 4 },
    },
  },
  {
    name: 'Missing value',
    description: 'A null value, which is not zero.',
    node: {
      type: 'metric',
      title: 'Bytes transferred',
      data: {
        columns: [
          {
            id: 'sum',
            label: 'Sum of bytes',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
        ],
        rows: [[null]],
      },
      value: { column: 'sum' },
    },
  },
  {
    name: 'Multivalue and date secondary',
    description:
      'A multivalue string as the headline and a date as the secondary value.',
    node: {
      type: 'metric',
      title: 'Latest deployment',
      data: {
        columns: [
          {
            id: 'tags',
            label: 'Last value of tags',
            type: 'string',
            role: 'metric',
            multivalue: true,
          },
          {
            id: 'at',
            label: 'Last value of @timestamp',
            type: 'date',
            role: 'metric',
            format: DATE,
          },
        ],
        rows: [
          [['production', 'canary', 'eu-west-1'], '2026-11-03T17:42:09.512Z'],
        ],
      },
      value: { column: 'tags' },
      secondary: { column: 'at', showLabel: true, labelPlacement: 'before' },
      layout: {
        density: 'compact',
        icon: { name: 'tag', alignment: 'left' },
        valuePosition: 'top',
        labelsAlignment: 'left',
        valueAlignment: 'left',
        valueSizing: 'auto',
        secondaryAlignment: 'left',
      },
    },
  },
  {
    name: 'Long title and subtitle',
    description: 'Text long enough to wrap or truncate in a small tile.',
    node: {
      type: 'metric',
      title:
        'Unique visitors from every region and every device type over the selected time range, excluding known crawlers',
      data: {
        columns: [
          {
            id: 'visitors',
            label:
              'Unique count of clientip across all regions and device types',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [[1_204_377]],
      },
      value: {
        column: 'visitors',
        subtitle:
          'Counted once per client IP address, even when a visitor returns on several days',
      },
    },
  },
  {
    name: 'Pre-rendered value with provenance',
    description:
      'A value in a format outside the portable set, pre-rendered in `display`, with the loss recorded and the Kibana panel it came from.',
    node: {
      type: 'metric',
      title: 'Top client',
      data: {
        columns: [
          {
            id: 'ip',
            label: 'Top value of clientip',
            type: 'string',
            role: 'metric',
          },
        ],
        rows: [['223.87.60.27']],
        display: { ip: ['223.87.60.27 (cn)'] },
      },
      value: { column: 'ip' },
      source: {
        kind: 'kibana',
        kibanaVersion: '9.4.0',
        materializer: 'lens',
        materializerVersion: 1,
        savedObjectType: 'dashboard',
        savedObjectId: 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
        panelId: '4',
        timeRange: {
          from: '2026-10-27T00:00:00.000Z',
          to: '2026-11-03T00:00:00.000Z',
        },
        capturedAt: '2026-11-03T09:15:00.000Z',
      },
      losses: [
        {
          path: 'metrics[0].format',
          kind: 'prerendered',
          note: 'Static lookup format: values pre-rendered in display.',
        },
      ],
    },
  },
];
