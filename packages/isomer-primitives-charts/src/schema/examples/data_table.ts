/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { ChartColumn } from '../data';
import type { DataTableNode } from '../data_table';

import { BYTES, NUMBER, PERCENT } from './shared';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 10, 3);

const host: ChartColumn = {
  id: 'host',
  label: 'host.name',
  type: 'string',
  role: 'dimension',
};
const count: ChartColumn = {
  id: 'count',
  label: 'Count of records',
  type: 'number',
  role: 'metric',
  format: NUMBER,
};
const bytes: ChartColumn = {
  id: 'bytes',
  label: 'Sum of bytes',
  type: 'number',
  role: 'metric',
  format: BYTES,
};

export const dataTableTopHosts: DataTableNode = {
  type: 'dataTable',
  title: 'Top hosts',
  data: {
    columns: [host, count, bytes],
    rows: [
      ['web-01', 4_120, 81_920_000],
      ['web-02', 6_310, 120_400_000],
      ['db-01', 1_904, 9_830_400],
      ['Other', 1_740, 22_000_000],
    ],
  },
  interactions: {
    select: ['cell'],
    initial: { sort: { column: 'count', direction: 'desc' } },
  },
};

const grades: DataTableNode['columns'] = [
  {
    column: 'status',
    decoration: {
      kind: 'badge',
      colors: {
        byKey: {
          ok: { light: '#24C292', dark: '#24C292' },
          degraded: { light: '#FCD883', dark: '#FCD883' },
          down: { light: '#F6726A', dark: '#F6726A' },
        },
      },
    },
  },
  { column: 'host' },
  {
    column: 'errors',
    decoration: {
      kind: 'background',
      colors: {
        bands: [
          { to: 0.01, color: { light: '#24C292', dark: '#24C292' } },
          {
            from: 0.01,
            to: 0.05,
            color: { light: '#FCD883', dark: '#FCD883' },
          },
          { from: 0.05, color: { light: '#F6726A', dark: '#F6726A' } },
        ],
      },
    },
  },
  {
    column: 'cpu',
    decoration: {
      kind: 'bar',
      min: 0,
      max: 1,
      colors: {
        bands: [
          { to: 0.8, color: { light: '#61A2FF', dark: '#61A2FF' } },
          { from: 0.8, color: { light: '#F6726A', dark: '#F6726A' } },
        ],
      },
    },
  },
  {
    column: 'latency',
    decoration: {
      kind: 'text',
      colors: {
        bands: [
          { to: 200, color: { light: '#008A5E', dark: '#24C292' } },
          { from: 200, color: { light: '#C61E25', dark: '#F6726A' } },
        ],
      },
    },
  },
];

export const dataTableExamples: PrimitiveExample<DataTableNode>[] = [
  {
    name: 'Top hosts',
    description:
      'A dimension and two metrics with Kibana’s default formats, an Other bucket, sorted by count, with cells a reader can select.',
    node: dataTableTopHosts,
  },
  {
    name: 'Colored cells, badges and bars',
    description:
      'Each kind of cell decoration: badges by value, cell backgrounds and text by value range, and bars over a fixed range.',
    node: {
      type: 'dataTable',
      title: 'Service health',
      data: {
        columns: [
          host,
          { id: 'status', label: 'Status', type: 'string', role: 'dimension' },
          {
            id: 'errors',
            label: 'Error rate',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
          {
            id: 'cpu',
            label: 'CPU',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
          {
            id: 'latency',
            label: 'p95 latency (ms)',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [
          ['web-01', 'ok', 0.004, 0.42, 120],
          ['web-02', 'degraded', 0.031, 0.87, 340],
          ['db-01', 'down', 0.12, 0.99, 910],
          ['cache-01', 'ok', 0, 0.12, 8],
        ],
      },
      columns: grades,
    },
  },
  {
    name: 'Missing, blank and empty',
    description:
      'A null cell, an empty string, a multivalue cell, a missing bucket and a column with no values, which the Scene flags.',
    node: {
      type: 'dataTable',
      title: 'Agents',
      data: {
        columns: [
          { ...host, id: 'agent', label: 'agent.name' },
          {
            id: 'tags',
            label: 'tags',
            type: 'string',
            role: 'dimension',
            multivalue: true,
          },
          {
            id: 'version',
            label: 'agent.version',
            type: 'string',
            role: 'dimension',
          },
          count,
          {
            id: 'unused',
            label: 'Average of cpu',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
        ],
        rows: [
          ['filebeat', ['prod', 'eu'], '9.2.0', 812, null],
          ['metricbeat', [], '', 96, null],
          ['(missing value)', ['dev'], null, 4, null],
          [null, null, '9.1.3', null, null],
        ],
      },
    },
  },
  {
    name: 'Paged with a summary row',
    description:
      'Twenty-four hourly rows, ten to a page, compact, with a total and an average in the footer.',
    node: {
      type: 'dataTable',
      title: 'Requests by hour',
      data: {
        columns: [
          {
            id: 'hour',
            label: '@timestamp per hour',
            type: 'date',
            role: 'dimension',
            format: {
              kind: 'date',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'UTC',
            },
          },
          count,
          bytes,
        ],
        rows: Array.from({ length: 24 }, (_, hour) => [
          START + hour * HOUR,
          1_000 + ((hour * 37) % 11) * 113,
          (2 + ((hour * 5) % 7)) * 1_048_576,
        ]),
      },
      columns: [
        { column: 'hour' },
        { column: 'count', summary: { kind: 'sum' } },
        { column: 'bytes', summary: { kind: 'avg', label: 'Mean' } },
      ],
      pageSize: 10,
      density: 'compact',
    },
  },
  {
    name: 'Huge, tiny and negative values',
    description:
      'Values across many orders of magnitude, with a bar that grows both ways from zero.',
    node: {
      type: 'dataTable',
      title: 'Balance changes',
      data: {
        columns: [
          { ...host, id: 'account', label: 'account.id' },
          {
            id: 'delta',
            label: 'Change',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'number',
              maximumFractionDigits: 3,
              signDisplay: 'exceptZero',
            },
          },
          {
            id: 'rate',
            label: 'Rate',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [
          ['a-1', 9_876_543_210, 0.00012],
          ['a-2', -42.5, 1e-9],
          ['a-3', 0, -3_000_000],
          ['a-4', -1_250_000, 7.25],
        ],
      },
      columns: [
        { column: 'account' },
        { column: 'delta', decoration: { kind: 'bar' } },
        { column: 'rate', alignment: 'center' },
      ],
    },
  },
  {
    name: 'Chosen columns, widths and pre-rendered values',
    description:
      'Columns shown in an order of their own, one left out, a fixed width, a URL format that arrives pre-rendered, and where the table came from.',
    node: {
      type: 'dataTable',
      title: '[Logs] Top URLs',
      description: 'The most requested URLs in the last 24 hours.',
      data: {
        columns: [
          { id: 'url', label: 'url.full', type: 'string', role: 'dimension' },
          count,
          {
            id: 'visitors',
            label: 'Unique visitors',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
          {
            id: 'agent',
            label: 'Top user agent',
            type: 'string',
            role: 'dimension',
          },
        ],
        rows: [
          [
            'https://www.elastic.co/downloads/beats/metricbeat',
            1_203,
            811,
            'Mozilla/5.0',
          ],
          ['https://www.elastic.co/guide/en/kibana', 970, 640, 'curl/8.4.0'],
          ['https://www.elastic.co/', 312, 290, 'Mozilla/5.0'],
        ],
        display: {
          url: ['/downloads/beats/metricbeat', '/guide/en/kibana', '/'],
        },
      },
      columns: [
        { column: 'count' },
        { column: 'url', width: 220 },
        { column: 'visitors' },
      ],
      interactions: {
        select: ['cell'],
        link: {
          href: 'https://kibana.example.com/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
          label: 'Open in Kibana',
        },
      },
      emphasis: [{ rows: [0], note: 'Most requested' }],
      source: {
        kind: 'kibana',
        kibanaVersion: '9.3.0',
        materializer: 'lens',
        materializerVersion: 1,
        savedObjectType: 'lens',
        savedObjectId: 'top-urls',
        timeRange: {
          from: '2026-11-02T00:00:00.000Z',
          to: '2026-11-03T00:00:00.000Z',
        },
        capturedAt: '2026-11-03T00:00:05.000Z',
      },
      losses: [
        {
          path: 'rows[0].format',
          kind: 'prerendered',
          note: 'The URL format arrives as display strings.',
        },
      ],
    },
  },
  {
    name: 'No rows',
    description: 'A query that matched nothing.',
    node: {
      type: 'dataTable',
      title: 'Failed logins',
      data: {
        columns: [{ ...host, id: 'user', label: 'user.name' }, count],
        rows: [],
      },
    },
  },
];
