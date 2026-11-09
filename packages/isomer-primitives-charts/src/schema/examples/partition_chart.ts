/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { ChartColumn } from '../data';
import type { PortableFormat } from '../format';
import type { PartitionChartNode } from '../partition_chart';

import { BYTES, NUMBER, START } from './shared';

const DAY = 86_400_000;

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

const COMPACT: PortableFormat = {
  kind: 'number',
  notation: 'compact',
  maximumFractionDigits: 1,
};

/** The smallest `partitionChart`: one pie layer. The catalog's example. */
export const partitionPie: PartitionChartNode = {
  type: 'partitionChart',
  title: 'Requests by response code',
  shape: 'pie',
  data: {
    columns: [dimension('status', 'http.response.status_code'), COUNT],
    rows: [
      ['200', 8_412],
      ['404', 1_204],
      ['500', 382],
      ['301', 655],
    ],
  },
  metrics: [{ column: 'count' }],
  groups: [{ column: 'status' }],
};

/** Named `partitionChart` examples covering the corpus edge cases, each valid in a composition. */
export const partitionChartExamples: PrimitiveExample<PartitionChartNode>[] = [
  {
    name: 'Pie',
    description:
      'One layer of slices, largest first, each named and labelled with its share.',
    node: partitionPie,
  },
  {
    name: 'Donut with Other and missing buckets',
    description:
      'A donut whose rows include the Other bucket and a missing (null) bucket, with a larger hole, colors for both schemes and a legend.',
    node: {
      type: 'partitionChart',
      title: 'Traffic by country',
      shape: 'donut',
      donutHole: 0.54,
      data: {
        columns: [dimension('country', 'geo.country_iso_code'), COUNT],
        rows: [
          ['US', 4_120],
          ['DE', 1_830],
          ['IN', 1_502],
          ['Other', 2_410],
          [null, 318],
        ],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'country' }],
      colors: {
        byKey: {
          US: { light: '#16C5C0', dark: '#16C5C0' },
          DE: { light: '#61A2FF', dark: '#61A2FF' },
          IN: { light: '#EE72A6', dark: '#EE72A6' },
          Other: { light: '#CAD3E2', dark: '#485975' },
          '\\null': { light: '#98A8C3', dark: '#5A6D8C' },
        },
      },
      legend: { visibility: 'visible', position: 'right' },
    },
  },
  {
    name: 'Nested pie with values',
    description:
      'Two layers, the inner colored by its outer slice and lightened toward the background, labelled with values in bytes, and a nested legend.',
    node: {
      type: 'partitionChart',
      title: 'Bytes by region and host',
      shape: 'pie',
      data: {
        columns: [
          dimension('region', 'cloud.region'),
          dimension('host', 'host.name'),
          {
            id: 'bytes',
            label: 'Sum of bytes',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
        ],
        rows: [
          ['us-east-1', 'web-01', 5_368_709_120],
          ['us-east-1', 'web-02', 3_221_225_472],
          ['eu-west-1', 'web-03', 2_147_483_648],
          ['eu-west-1', 'web-04', 1_073_741_824],
          ['ap-south-1', 'web-05', 858_993_459],
        ],
      },
      metrics: [{ column: 'bytes' }],
      groups: [{ column: 'region' }, { column: 'host' }],
      labels: { values: 'value' },
      legend: { nested: true },
    },
  },
  {
    name: 'Treemap',
    description:
      'Rectangles nested by service and then transaction, with names only.',
    node: {
      type: 'partitionChart',
      title: 'Transactions by service',
      shape: 'treemap',
      data: {
        columns: [
          dimension('service', 'service.name'),
          dimension('transaction', 'transaction.name'),
          COUNT,
        ],
        rows: [
          ['checkout', 'POST /cart', 2_400],
          ['checkout', 'GET /cart', 1_900],
          ['catalog', 'GET /products', 5_200],
          ['catalog', 'GET /products/:id', 3_100],
          ['auth', 'POST /login', 1_250],
        ],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'service' }, { column: 'transaction' }],
      labels: { values: 'hidden' },
    },
  },
  {
    name: 'Mosaic',
    description:
      'Columns by operating system in the order the rows have them, each split by browser, largest first, colored by browser.',
    node: {
      type: 'partitionChart',
      title: 'Visitors by OS and browser',
      shape: 'mosaic',
      data: {
        columns: [
          dimension('os', 'user_agent.os.name'),
          dimension('browser', 'user_agent.name'),
          COUNT,
        ],
        rows: [
          ['Windows', 'Chrome', 3_400],
          ['Windows', 'Edge', 1_200],
          ['Windows', 'Firefox', 600],
          ['macOS', 'Safari', 2_100],
          ['macOS', 'Chrome', 1_500],
          ['Linux', 'Firefox', 900],
          ['Linux', 'Chrome', 700],
        ],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'os' }, { column: 'browser' }],
    },
  },
  {
    name: 'Waffle by day',
    description:
      'A waffle over a date group, whose names print in the column’s date format, with each value in the legend.',
    node: {
      type: 'partitionChart',
      title: 'Alerts by day',
      shape: 'waffle',
      data: {
        columns: [
          {
            id: 'day',
            label: '@timestamp per day',
            type: 'date',
            role: 'dimension',
            format: {
              kind: 'date',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            },
          },
          COUNT,
        ],
        rows: [
          [START, 42],
          [START + DAY, 17],
          [START + 2 * DAY, 28],
          [START + 3 * DAY, 9],
        ],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'day' }],
    },
  },
  {
    name: 'Several metrics',
    description:
      'A waffle of two metrics and no groups: one slice per metric, named by its column, colored by its column id, with values in the legend.',
    node: {
      type: 'partitionChart',
      title: 'Memory',
      shape: 'waffle',
      data: {
        columns: [
          {
            id: 'used',
            label: 'Used',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
          {
            id: 'free',
            label: 'Free',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
        ],
        rows: [[12_884_901_888, 4_294_967_296]],
      },
      metrics: [{ column: 'used' }, { column: 'free' }],
      colors: {
        byKey: {
          used: { light: '#F6726A', dark: '#F6726A' },
          free: { light: '#CAD3E2', dark: '#485975' },
        },
      },
      labels: { values: 'value' },
    },
  },
  {
    name: 'Huge, tiny and zero slices',
    description:
      'Compact numbers, slices too small to hold their names, which draw outside with a line, a zero slice, and a missing value counted as 0.',
    node: {
      type: 'partitionChart',
      title: 'Events by source',
      shape: 'pie',
      data: {
        columns: [
          dimension('source', 'event.dataset'),
          { ...COUNT, format: COMPACT },
        ],
        rows: [
          ['system.syslog', 9_800_000_000],
          ['nginx.access', 2_100_000_000],
          ['nginx.error', 12_000_000],
          ['auditd.log', 3_400_000],
          ['kernel', 0],
          ['unknown', null],
        ],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'source' }],
      labels: { percentDecimals: 1 },
    },
  },
  {
    name: 'Negative values',
    description:
      'A negative value, which leaves the chart empty with a note, as Lens does.',
    node: {
      type: 'partitionChart',
      title: 'Net change by team',
      shape: 'pie',
      data: {
        columns: [
          dimension('team', 'team'),
          {
            id: 'change',
            label: 'Net change',
            type: 'number',
            role: 'metric',
            format: NUMBER,
          },
        ],
        rows: [
          ['Platform', 12],
          ['Search', -4],
        ],
      },
      metrics: [{ column: 'change' }],
      groups: [{ column: 'team' }],
    },
  },
  {
    name: 'No rows',
    description: 'No data: the chart says there are no results.',
    node: {
      type: 'partitionChart',
      title: 'Errors by service',
      shape: 'treemap',
      data: {
        columns: [dimension('service', 'service.name'), COUNT],
        rows: [],
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'service' }],
    },
  },
  {
    name: 'Selectable, pre-rendered and with provenance',
    description:
      'Slices a reader can select, names pre-rendered by the host, an emphasized slice with a note, a link, provenance and a recorded loss.',
    node: {
      type: 'partitionChart',
      title: 'Hosts by OS',
      description: 'Share of hosts reporting in the last 24 hours.',
      shape: 'donut',
      data: {
        columns: [
          {
            id: 'os',
            label: 'host.os.type',
            type: 'string',
            role: 'dimension',
            source: { field: 'host.os.type' },
          },
          COUNT,
        ],
        rows: [
          ['linux', 412],
          ['windows', 187],
          ['macos', 64],
        ],
        display: { os: ['Linux (all distributions)', 'Windows', 'macOS'] },
      },
      metrics: [{ column: 'count' }],
      groups: [{ column: 'os' }],
      interactions: {
        select: ['slice'],
        link: {
          label: 'Open in Kibana',
          href: 'https://kibana.example.com/app/lens#/edit/hosts-by-os',
        },
      },
      emphasis: [{ rows: [1], note: 'Windows hosts dropped 12% this week.' }],
      source: {
        host: 'kibana',
        hostVersion: '9.3.0',
        capturedAt: '2026-11-03T12:00:00Z',
        timeRange: {
          from: '2026-11-02T12:00:00Z',
          to: '2026-11-03T12:00:00Z',
        },
      },
      losses: [
        {
          path: 'data.display.os',
          kind: 'prerendered',
          note: 'host.os.type uses a static lookup field format.',
        },
      ],
    },
  },
];
