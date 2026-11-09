/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { Cell, ChartColumn } from '../data';
import type { HeatmapNode } from '../heatmap';

import { HOUR, NUMBER, START } from './shared';

const COUNT: ChartColumn = {
  id: 'count',
  label: 'Count of records',
  type: 'number',
  role: 'metric',
  format: NUMBER,
};

const TIMESTAMP: ChartColumn = {
  id: 'timestamp',
  label: '@timestamp per hour',
  type: 'date',
  role: 'dimension',
  format: { kind: 'date', hour: '2-digit', minute: '2-digit', hour12: false },
};

const dimension = (id: string, label: string): ChartColumn => ({
  id,
  label,
  type: 'string',
  role: 'dimension',
});

const HOSTS = ['web-01', 'web-02', 'db-01'];

/** Each of `hosts` at each of `hours` hours from `START`, counted by `count`. */
const hourly = (
  hours: number,
  hosts: readonly string[],
  count: (hour: number, host: number) => Cell
): Cell[][] =>
  Array.from({ length: hours }, (_, hour) =>
    hosts.map((host, index) => [START + hour * HOUR, host, count(hour, index)])
  ).flat();

/** The smallest `heatmap`: requests by hour and host. The catalog's example. */
export const heatmapHourly: HeatmapNode = {
  type: 'heatmap',
  title: 'Requests by hour and host',
  data: {
    columns: [TIMESTAMP, dimension('host', 'host.name'), COUNT],
    rows: hourly(8, HOSTS, (hour, host) => ((hour * 37 + host * 53) % 90) + 4),
  },
  x: { column: 'timestamp', interval: HOUR },
  y: { column: 'host' },
  value: { column: 'count' },
};

/** Named `heatmap` examples covering the corpus edge cases, each valid in a composition. */
export const heatmapExamples: PrimitiveExample<HeatmapNode>[] = [
  {
    name: 'Hourly by host',
    description:
      'A time axis of hourly buckets by host, in Lens’s default five temperature colors from the smallest count to the largest.',
    node: heatmapHourly,
  },
  {
    name: 'Stated bands with Other and missing buckets',
    description:
      'Categories on both axes, including the Other bucket and a missing (null) bucket, colored by absolute bands for both schemes, with values written in the cells and the legend below.',
    node: {
      type: 'heatmap',
      title: 'Errors by service and region',
      data: {
        columns: [
          dimension('service', 'service.name'),
          dimension('region', 'cloud.region'),
          {
            id: 'errors',
            label: 'Error rate',
            type: 'number',
            role: 'metric',
            format: { kind: 'percent', maximumFractionDigits: 1 },
          },
        ],
        rows: [
          ['checkout', 'us-east-1', 0.012],
          ['checkout', 'eu-west-1', 0.031],
          ['checkout', null, 0.004],
          ['search', 'us-east-1', 0.067],
          ['search', 'eu-west-1', 0.022],
          ['search', null, 0.009],
          ['Other', 'us-east-1', 0.041],
          ['Other', 'eu-west-1', 0.018],
          [null, 'us-east-1', 0.102],
        ],
      },
      x: { column: 'service' },
      y: { column: 'region' },
      value: { column: 'errors' },
      colors: {
        bands: [
          { from: 0, to: 0.01, color: { light: '#CFE1FF', dark: '#1D3E73' } },
          {
            from: 0.01,
            to: 0.05,
            color: { light: '#FCD883', dark: '#8A6A0A' },
          },
          { from: 0.05, color: { light: '#F6726A', dark: '#C61E25' } },
        ],
      },
      cellLabels: true,
      axes: { x: { title: 'Service' }, y: { title: 'Region' } },
      legend: { position: 'bottom' },
    },
  },
  {
    name: 'Percentage bands, sorted',
    description:
      'Band bounds as percentages of the value range, numbers on the x axis sorted high to low, names on the y axis sorted A to Z, and turned x labels.',
    node: {
      type: 'heatmap',
      title: 'Latency by status and endpoint',
      data: {
        columns: [
          {
            id: 'status',
            label: 'http.response.status_code',
            type: 'number',
            role: 'dimension',
            format: { kind: 'number', useGrouping: false },
          },
          dimension('endpoint', 'url.path'),
          {
            id: 'latency',
            label: 'Median latency',
            type: 'number',
            role: 'metric',
            format: { kind: 'number', maximumFractionDigits: 0, suffix: ' ms' },
          },
        ],
        rows: [
          [200, '/api/search', 120],
          [200, '/api/cart', 85],
          [500, '/api/search', 2_400],
          [500, '/api/cart', 1_900],
          [404, '/api/search', 15],
          [404, '/api/cart', 22],
          [301, '/api/search', 4],
        ],
      },
      x: { column: 'status', sort: 'desc' },
      y: { column: 'endpoint', sort: 'asc' },
      value: { column: 'latency' },
      bandsRange: 'percentage',
      colors: {
        bands: [
          { from: 0, to: 25, color: { light: '#A6EDEA', dark: '#16C5C0' } },
          { from: 25, to: 75, color: { light: '#FFC7DB', dark: '#EE72A6' } },
          { from: 75, to: 100, color: { light: '#F6726A', dark: '#F6726A' } },
        ],
      },
      axes: { x: { labelOrientation: 'angled' } },
    },
  },
  {
    name: 'One row, no y',
    description:
      'Only an x axis: one row of cells by day, with no y labels and no legend.',
    node: {
      type: 'heatmap',
      title: 'Deployments by day',
      data: {
        columns: [
          {
            id: 'day',
            label: '@timestamp per day',
            type: 'date',
            role: 'dimension',
            format: { kind: 'date', month: 'short', day: 'numeric' },
          },
          COUNT,
        ],
        rows: Array.from({ length: 7 }, (_, day) => [
          START + day * 24 * HOUR,
          [3, 0, 7, 12, 5, 1, 9][day]!,
        ]),
      },
      x: { column: 'day' },
      value: { column: 'count' },
      legend: { visibility: 'hidden' },
    },
  },
  {
    name: 'Huge, tiny and missing values',
    description:
      'Values from 1e-9 to 1e300 with missing and out-of-band values: a missing value leaves its cell empty, and a value in no band is transparent.',
    node: {
      type: 'heatmap',
      title: 'Magnitudes',
      data: {
        columns: [
          dimension('series', 'series'),
          dimension('bucket', 'bucket'),
          {
            id: 'value',
            label: 'Value',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'number',
              notation: 'compact',
              maximumFractionDigits: 2,
            },
          },
        ],
        rows: [
          ['a', 'small', 1e-9],
          ['a', 'large', 1e300],
          ['b', 'small', null],
          ['b', 'large', 42],
          ['c', 'small', -5],
          ['c', 'large', 0],
        ],
      },
      x: { column: 'series' },
      y: { column: 'bucket' },
      value: { column: 'value' },
      colors: {
        bands: [
          { from: 0, to: 1, color: { light: '#BFDBFF', dark: '#2B5FA3' } },
          { from: 1, to: 1e6, color: { light: '#61A2FF', dark: '#61A2FF' } },
          { from: 1e6, color: { light: '#EE72A6', dark: '#EE72A6' } },
        ],
      },
    },
  },
  {
    name: 'Every value the same',
    description:
      'One value in every cell: with the default palette, every cell takes the last band.',
    node: {
      type: 'heatmap',
      title: 'Replicas by zone and tier',
      data: {
        columns: [
          dimension('zone', 'cloud.availability_zone'),
          dimension('tier', 'tier'),
          {
            id: 'replicas',
            label: 'Replicas',
            type: 'number',
            role: 'metric',
          },
        ],
        rows: [
          ['a', 'hot', 3],
          ['b', 'hot', 3],
          ['a', 'warm', 3],
          ['b', 'warm', 3],
        ],
      },
      x: { column: 'zone' },
      y: { column: 'tier' },
      value: { column: 'replicas' },
    },
  },
  {
    name: 'No rows',
    description: 'No data: the chart says there are no results.',
    node: {
      type: 'heatmap',
      title: 'Errors by hour and host',
      data: {
        columns: [TIMESTAMP, dimension('host', 'host.name'), COUNT],
        rows: [],
      },
      x: { column: 'timestamp' },
      y: { column: 'host' },
      value: { column: 'count' },
    },
  },
  {
    name: 'Selectable, brushable, pre-rendered and with provenance',
    description:
      'Cells a reader can select, a time range they can brush, values pre-rendered by the host, axis titles, an emphasized cell with a note, a link, provenance and a recorded loss.',
    node: {
      type: 'heatmap',
      title: 'CPU by hour and host',
      description: 'Mean CPU per host in each hour of the last shift.',
      data: {
        columns: [
          { ...TIMESTAMP, source: { field: '@timestamp' } },
          {
            ...dimension('host', 'host.name'),
            source: { field: 'host.name' },
          },
          {
            id: 'cpu',
            label: 'Mean system.cpu.total.norm.pct',
            type: 'number',
            role: 'metric',
            format: { kind: 'percent', maximumFractionDigits: 0 },
          },
        ],
        rows: hourly(6, HOSTS.slice(0, 2), (hour, host) =>
          Number((0.18 + ((hour * 13 + host * 29) % 70) / 100).toFixed(2))
        ),
        display: {
          cpu: hourly(6, HOSTS.slice(0, 2), (hour, host) => {
            const value = 0.18 + ((hour * 13 + host * 29) % 70) / 100;
            return `${Math.round(value * 100)} % CPU`;
          }).map((row) => String(row[2])),
        },
      },
      x: { column: 'timestamp', interval: HOUR },
      y: { column: 'host' },
      value: { column: 'cpu' },
      bandsRange: 'percentage',
      colors: {
        bands: [
          { from: 0, to: 50, color: { light: '#A6EDEA', dark: '#16C5C0' } },
          { from: 50, to: 80, color: { light: '#FCD883', dark: '#EAAE01' } },
          { from: 80, color: { light: '#F6726A', dark: '#F6726A' } },
        ],
      },
      cellLabels: true,
      axes: {
        x: { title: 'Hour', labelOrientation: 'angled' },
        y: { title: 'Host' },
      },
      interactions: {
        select: ['cell'],
        brush: { column: 'timestamp' },
        link: {
          label: 'Open in Kibana',
          href: 'https://kibana.example.com/app/lens#/edit/cpu-by-host',
        },
      },
      emphasis: [{ rows: [7], note: 'web-02 peaked at 03:00.' }],
      source: {
        host: 'kibana',
        hostVersion: '9.3.0',
        capturedAt: '2026-11-03T12:00:00Z',
        timeRange: {
          from: '2026-11-03T00:00:00Z',
          to: '2026-11-03T06:00:00Z',
        },
      },
      losses: [
        {
          path: 'data.display.cpu',
          kind: 'prerendered',
          note: 'The CPU field uses a custom field format.',
        },
      ],
    },
  },
];
