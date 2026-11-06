/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { Cell, ChartColumn } from '../data';
import type { PortableFormat } from '../format';
import type { XyChartNode } from '../xy_chart';

import { BYTES, HOUR, NUMBER, PERCENT, START } from './shared';

const HOURLY: PortableFormat = {
  kind: 'date',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
};

const hours = (count: number) =>
  Array.from({ length: count }, (_, index) => START + index * HOUR);

/** The value at `index`, or null past the end. */
const pick = (values: readonly Cell[], index: number): Cell =>
  values[index] ?? null;

const timeColumn: ChartColumn = {
  id: 'time',
  label: '@timestamp per hour',
  type: 'date',
  role: 'dimension',
  format: HOURLY,
};

const countColumn: ChartColumn = {
  id: 'count',
  label: 'Count of records',
  type: 'number',
  role: 'metric',
  format: NUMBER,
};

const vis = (hex: string) => ({ light: hex, dark: hex });

/** One line over a time axis. The catalog's example. */
export const xyTimeSeries: XyChartNode = {
  type: 'xyChart',
  title: 'Requests over time',
  data: {
    columns: [timeColumn, countColumn],
    rows: hours(6).map((time, index) => [
      time,
      pick([120, 98, 143, 210, 187, 164], index),
    ]),
  },
  layers: [{ kind: 'data', mark: 'line', x: 'time', y: [{ column: 'count' }] }],
  axes: { x: { scale: 'temporal' } },
};

const statusRows = hours(3).flatMap((time, index) => [
  [time, '200', pick([802, 911, 870], index)],
  [time, '404', pick([41, 37, 52], index)],
  [time, 'Other', pick([12, 9, 15], index)],
  [time, null, pick([3, 0, 1], index)],
]);

/** Interactive: selectable marks, series and legend items, a time brush, and a static highlight. */
export const xyInteractive: XyChartNode = {
  type: 'xyChart',
  id: 'responses',
  title: 'Responses by status',
  data: {
    columns: [
      { ...timeColumn, source: { field: '@timestamp', sourceParams: {} } },
      {
        id: 'status',
        label: 'Top 2 values of response.code',
        type: 'string',
        role: 'dimension',
        source: {
          field: 'response.code',
          otherBucket: true,
          missingBucket: true,
        },
      },
      countColumn,
    ],
    rows: statusRows,
  },
  layers: [
    {
      kind: 'data',
      mark: 'bar',
      stack: 'stacked',
      x: 'time',
      y: [{ column: 'count' }],
      splitBy: 'status',
    },
  ],
  axes: { x: { scale: 'temporal' } },
  interactions: {
    select: ['datum', 'series', 'category', 'legend'],
    brush: { column: 'time' },
    sync: { cursor: true, tooltips: true },
    link: {
      href: 'https://kibana.example.com/app/lens#/edit/b2f4f8a0-1d2c-11ee-9f1a-0b2e5c1e7d3a',
      label: 'Open in Kibana',
    },
    initial: { hiddenSeries: ['\\null'] },
  },
  emphasis: [{ rows: [5], note: '404s peak at 01:00' }],
};

/** Named `xyChart` examples covering the corpus edge cases, each valid in a composition. */
export const xyChartExamples: PrimitiveExample<XyChartNode>[] = [
  {
    name: 'Time series line',
    description: 'One line over a time axis.',
    node: xyTimeSeries,
  },
  {
    name: 'Stacked bars with Other and missing buckets',
    description:
      'Bars split by a terms column, including the Other bucket and the missing (null) bucket, with a color per series key.',
    node: {
      type: 'xyChart',
      title: 'Responses by status',
      data: {
        columns: [
          timeColumn,
          {
            id: 'status',
            label: 'Top 2 values of response.code',
            type: 'string',
            role: 'dimension',
          },
          countColumn,
        ],
        rows: statusRows,
      },
      colors: {
        byKey: {
          '200': vis('#16C5C0'),
          '404': vis('#61A2FF'),
          Other: vis('#BFDBFF'),
          '\\null': vis('#EE72A6'),
        },
      },
      layers: [
        {
          kind: 'data',
          mark: 'bar',
          stack: 'stacked',
          x: 'time',
          y: [{ column: 'count' }],
          splitBy: 'status',
        },
      ],
      axes: { x: { scale: 'temporal', title: '@timestamp per hour' } },
      legend: { visibility: 'visible', position: 'right' },
    },
  },
  {
    name: 'Interactive stacked bars',
    description:
      'Selectable marks, series and legend items, a time brush, synced cursor, a link back to the source, a series hidden at first, and a highlighted row.',
    node: xyInteractive,
  },
  {
    name: 'Horizontal bars',
    description:
      'Categories on the vertical axis, sorted as the source table is.',
    node: {
      type: 'xyChart',
      title: 'Top destinations',
      orientation: 'horizontal',
      data: {
        columns: [
          {
            id: 'dest',
            label: 'Top 5 values of geo.dest',
            type: 'string',
            role: 'dimension',
          },
          countColumn,
        ],
        rows: [
          ['CN', 2_461],
          ['IN', 2_190],
          ['US', 1_294],
          ['ID', 467],
          ['BR', 412],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'bar',
          x: 'dest',
          y: [{ column: 'count', color: vis('#16C5C0') }],
        },
      ],
      axes: { x: { scale: 'ordinal' } },
      style: { barValueLabels: true },
    },
  },
  {
    name: 'Percentage areas',
    description: 'Areas stacked to 100%, with a percent format on y.',
    node: {
      type: 'xyChart',
      title: 'Share of traffic by OS',
      data: {
        columns: [
          timeColumn,
          {
            id: 'os',
            label: 'Top 3 values of machine.os',
            type: 'string',
            role: 'dimension',
          },
          countColumn,
        ],
        rows: hours(3).flatMap((time, index) => [
          [time, 'win', pick([40, 44, 39], index)],
          [time, 'osx', pick([30, 28, 33], index)],
          [time, 'ios', pick([20, 19, 25], index)],
        ]),
      },
      layers: [
        {
          kind: 'data',
          mark: 'area',
          stack: 'percentage',
          x: 'time',
          y: [{ column: 'count' }],
          splitBy: 'os',
        },
      ],
      axes: {
        x: { scale: 'temporal' },
        y: { domain: { kind: 'full' }, title: 'Share' },
      },
      style: { areaOpacity: 0.7, interpolation: 'smooth' },
    },
  },
  {
    name: 'Two y axes',
    description:
      'Bytes as bars on the left axis and a rate as a line on the right axis.',
    node: {
      type: 'xyChart',
      title: 'Traffic and error rate',
      data: {
        columns: [
          timeColumn,
          {
            id: 'bytes',
            label: 'Sum of bytes',
            type: 'number',
            role: 'metric',
            format: BYTES,
          },
          {
            id: 'errors',
            label: 'Error rate',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
        ],
        rows: hours(4).map((time, index) => [
          time,
          pick([5.2e8, 6.1e8, 4.8e8, 7.3e8], index),
          pick([0.012, 0.009, 0.031, 0.018], index),
        ]),
      },
      layers: [
        {
          kind: 'data',
          mark: 'bar',
          x: 'time',
          y: [{ column: 'bytes', axis: 'y', color: vis('#61A2FF') }],
        },
        {
          kind: 'data',
          mark: 'line',
          x: 'time',
          y: [{ column: 'errors', axis: 'y2', color: vis('#F6726A') }],
        },
      ],
      axes: {
        x: { scale: 'temporal' },
        y: { title: 'Bytes' },
        y2: { title: 'Errors', domain: { kind: 'fit' } },
      },
      style: { points: 'visible' },
    },
  },
  {
    name: 'Reference lines and annotations',
    description:
      'A threshold line with a fill, a point annotation and a range annotation; none of them are selectable.',
    node: {
      type: 'xyChart',
      title: 'CPU with SLO',
      data: {
        columns: [
          timeColumn,
          {
            id: 'cpu',
            label: 'Average of system.cpu.pct',
            type: 'number',
            role: 'metric',
            format: PERCENT,
          },
        ],
        rows: hours(6).map((time, index) => [
          time,
          pick([0.42, 0.51, 0.88, 0.93, 0.61, 0.47], index),
        ]),
      },
      layers: [
        { kind: 'data', mark: 'line', x: 'time', y: [{ column: 'cpu' }] },
        {
          kind: 'referenceLines',
          lines: [
            {
              value: 0.8,
              label: 'SLO',
              format: PERCENT,
              showText: true,
              color: vis('#E7664C'),
              fill: 'above',
              strokeDash: 'dashed',
              strokeWidth: 2,
            },
          ],
        },
        {
          kind: 'annotations',
          events: [
            {
              kind: 'point',
              at: START + 2 * HOUR,
              label: 'Deploy 1.42',
              icon: 'triangle',
              color: vis('#61A2FF'),
              line: { width: 1, dash: 'dotted' },
            },
            {
              kind: 'range',
              from: '2026-11-03T03:00:00.000Z',
              to: '2026-11-03T04:00:00.000Z',
              label: 'Incident',
              fill: 'inside',
              color: vis('#FFC7DB'),
            },
          ],
        },
      ],
      axes: {
        x: { scale: 'temporal' },
        y: { domain: { kind: 'custom', min: 0, max: 1 } },
      },
    },
  },
  {
    name: 'Layers from two tables',
    description:
      'Two source tables appended in layer order; each layer reads its own row range.',
    node: {
      type: 'xyChart',
      title: 'This week and last week',
      data: {
        columns: [
          timeColumn,
          { ...countColumn, id: 'current', label: 'This week' },
          { ...countColumn, id: 'previous', label: 'Last week' },
        ],
        rows: [
          ...hours(3).map((time, index) => [
            time,
            pick([12, 18, 15], index),
            null,
          ]),
          ...hours(3).map((time, index) => [
            time,
            null,
            pick([10, 11, 19], index),
          ]),
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 'time',
          y: [{ column: 'current' }],
          rows: [0, 3],
        },
        {
          kind: 'data',
          mark: 'line',
          x: 'time',
          y: [{ column: 'previous' }],
          rows: [3, 6],
        },
      ],
    },
  },
  {
    name: 'Negative, huge and tiny values',
    description: 'Bars crossing zero, with values far apart in magnitude.',
    node: {
      type: 'xyChart',
      title: 'Balance change',
      data: {
        columns: [
          {
            id: 'account',
            label: 'Account',
            type: 'string',
            role: 'dimension',
          },
          { ...countColumn, id: 'delta', label: 'Change' },
        ],
        rows: [
          ['A', -1_250_000_000_000],
          ['B', 0.000_42],
          ['C', 987_654_321_012],
          ['D', -0.5],
        ],
      },
      layers: [
        { kind: 'data', mark: 'bar', x: 'account', y: [{ column: 'delta' }] },
      ],
      axes: { y: { domain: { kind: 'fit' }, rounding: false } },
    },
  },
  {
    name: 'Gaps and fitting',
    description: 'Missing values drawn as gaps carried across, emphasized.',
    node: {
      type: 'xyChart',
      title: 'Sensor readings',
      data: {
        columns: [
          timeColumn,
          { ...countColumn, id: 'reading', label: 'Reading' },
        ],
        rows: hours(6).map((time, index) => [
          time,
          pick([3.2, null, null, 4.1, 3.9, null], index),
        ]),
      },
      layers: [
        { kind: 'data', mark: 'area', x: 'time', y: [{ column: 'reading' }] },
      ],
      style: {
        fitting: { kind: 'carry', emphasize: true, extend: 'nearest' },
        partialBuckets: {
          from: '2026-11-03T00:30:00.000Z',
          to: '2026-11-03T05:30:00.000Z',
        },
        currentTime: '2026-11-03T05:15:00.000Z',
      },
    },
  },
  {
    name: 'Authored with palette colors',
    description:
      'An agent-authored chart with no Kibana behind it, picking series colors from the default categorical palette.',
    node: {
      type: 'xyChart',
      title: 'Signups by plan',
      description: 'Weekly signups for the free and paid plans.',
      data: {
        columns: [
          { id: 'week', label: 'Week', type: 'string', role: 'dimension' },
          { id: 'free', label: 'Free', type: 'number', role: 'metric' },
          { id: 'paid', label: 'Paid', type: 'number', role: 'metric' },
        ],
        rows: [
          ['W1', 320, 41],
          ['W2', 355, 48],
          ['W3', 298, 52],
        ],
      },
      layers: [
        {
          kind: 'data',
          mark: 'bar',
          x: 'week',
          y: [
            { column: 'free', color: { palette: 'categorical', index: 0 } },
            { column: 'paid', color: { palette: 'categorical', index: 1 } },
          ],
        },
      ],
      legend: { visibility: 'visible', position: 'bottom', layout: 'list' },
    },
  },
  {
    name: 'Long labels and legend statistics',
    description:
      'Long category names and series names, with an inside legend that shows statistics.',
    node: {
      type: 'xyChart',
      title:
        'Median response time for the checkout, search and recommendation services across every availability zone',
      data: {
        columns: [
          timeColumn,
          {
            id: 'service',
            label: 'Top 2 values of service.name',
            type: 'string',
            role: 'dimension',
          },
          {
            id: 'p50',
            label: 'Median of transaction.duration.us',
            type: 'number',
            role: 'metric',
            format: {
              kind: 'duration',
              input: 'microseconds',
              output: 'milliseconds',
              maximumFractionDigits: 1,
              unitDisplay: 'short',
            },
          },
        ],
        rows: hours(2).flatMap((time, index) => [
          [
            time,
            'checkout-service-production-eu-west-1',
            pick([41_200, 39_800], index),
          ],
          [
            time,
            'recommendation-engine-canary-us-east-2',
            pick([88_100, 91_700], index),
          ],
        ]),
      },
      layers: [
        {
          kind: 'data',
          mark: 'line',
          x: 'time',
          y: [{ column: 'p50' }],
          splitBy: 'service',
        },
      ],
      legend: {
        visibility: 'visible',
        inside: 'top_left',
        columns: 1,
        maxLines: 2,
        statistics: ['avg', 'last_value'],
        seriesHeader: 'Service',
      },
      axes: {
        x: { labelOrientation: 'angled', grid: false },
        y: { ticks: true, grid: true, scale: 'log' },
      },
    },
  },
];
