/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { VegaNode } from './node';

const DAY = 86_400_000;
/** 2026-03-01T00:00:00Z. */
const START = 1_772_323_200_000;
const errorsPerDay = [12, 18, 41, 23, 9, 7, 15, 22, 31, 28, 19, 14, 11, 16];

/** A typed table the spec reads as `table`: text surfaces show it, and a click selects its rows. */
export const vegaExample: VegaNode = {
  type: 'vega',
  id: 'checkout-errors',
  mode: 'vega-lite',
  title: 'Checkout errors by day',
  description: 'Checkout errors peaked on Wednesday and fell back by Friday.',
  width: 480,
  height: 240,
  data: {
    columns: [
      { id: 'day', label: 'Day', type: 'string', role: 'dimension' },
      {
        id: 'errors',
        label: 'Errors',
        type: 'number',
        role: 'metric',
        format: { kind: 'number', maximumFractionDigits: 0 },
      },
    ],
    rows: [
      ['Mon', 12],
      ['Tue', 18],
      ['Wed', 41],
      ['Thu', 23],
      ['Fri', 9],
    ],
  },
  interactions: { select: ['mark'] },
  spec: {
    data: { name: 'table' },
    mark: { type: 'bar', tooltip: true, cursor: 'pointer' },
    encoding: {
      x: { field: 'day', type: 'ordinal', sort: null, title: 'Day' },
      y: { field: 'errors', type: 'quantitative', title: 'Errors' },
    },
  },
};

/** A brush over a time column: the spec writes `[from, to]` to the signal `interactions.brush` names. */
export const brushExample: VegaNode = {
  type: 'vega',
  id: 'requests-brush',
  mode: 'vega-lite',
  title: 'Requests per day',
  description:
    'Requests per day over two weeks of March; drag to select a range.',
  width: 560,
  height: 220,
  data: {
    columns: [
      {
        id: 'day',
        label: 'Day',
        type: 'date',
        role: 'dimension',
        format: { kind: 'date', month: 'short', day: 'numeric' },
      },
      { id: 'requests', label: 'Requests', type: 'number', role: 'metric' },
    ],
    rows: errorsPerDay.map((errors, index) => [
      START + index * DAY,
      errors * 120,
    ]),
  },
  interactions: { brush: { column: 'day', signal: 'range' } },
  spec: {
    data: { name: 'table' },
    params: [
      { name: 'brush', select: { type: 'interval', encodings: ['x'] } },
      {
        name: 'range',
        expr: 'brush.day ? [+brush.day[0], +brush.day[1]] : null',
      },
    ],
    mark: 'area',
    encoding: {
      x: {
        field: 'day',
        type: 'temporal',
        title: null,
        scale: { type: 'utc' },
        axis: { format: '%b %d' },
      },
      y: { field: 'requests', type: 'quantitative', title: 'Requests' },
    },
  },
};

export const vegaGrammarExample: VegaNode = {
  type: 'vega',
  title: 'Revenue share by region',
  mode: 'vega',
  width: 320,
  height: 200,
  description: 'Three regions by share of revenue.',
  spec: {
    data: [
      {
        name: 'table',
        values: [
          { region: 'EMEA', share: 0.42 },
          { region: 'AMER', share: 0.38 },
          { region: 'APAC', share: 0.2 },
        ],
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'band',
        domain: { data: 'table', field: 'region' },
        range: 'width',
        padding: 0.2,
      },
      {
        name: 'y',
        domain: { data: 'table', field: 'share' },
        range: 'height',
        nice: true,
      },
    ],
    axes: [
      { orient: 'bottom', scale: 'x' },
      { orient: 'left', scale: 'y', format: '%' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'table' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'region' },
            width: { scale: 'x', band: 1 },
            y: { scale: 'y', field: 'share' },
            y2: { scale: 'y', value: 0 },
          },
        },
      },
    ],
  },
};

/** A time range given as timestamps, as Kibana's `%timefilter%` resolves one. */
export const timeSeriesExample: VegaNode = {
  type: 'vega',
  title: 'Checkout errors per day',
  mode: 'vega-lite',
  width: 560,
  height: 240,
  description: 'Daily checkout errors over the first two weeks of March.',
  spec: {
    data: {
      values: errorsPerDay.map((errors, index) => ({
        timestamp: START + index * DAY,
        errors,
      })),
    },
    mark: { type: 'line', point: true },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        title: null,
        scale: { type: 'utc', domain: [START, START + 13 * DAY] },
        axis: { format: '%b %d' },
      },
      y: { field: 'errors', type: 'quantitative' },
    },
  },
};

export const histogramExample: VegaNode = {
  type: 'vega',
  title: 'Checkout latency',
  mode: 'vega-lite',
  width: 480,
  height: 240,
  description: 'Most checkout requests finish in under 300 ms.',
  spec: {
    data: {
      values: [
        42, 55, 61, 78, 88, 93, 104, 117, 122, 131, 140, 152, 158, 166, 171,
        183, 190, 204, 211, 226, 238, 251, 263, 280, 296, 318, 344, 391, 452,
        610,
      ].map((latency) => ({ latency })),
    },
    mark: 'bar',
    encoding: {
      x: {
        field: 'latency',
        type: 'quantitative',
        bin: { maxbins: 12 },
        title: 'Latency (ms)',
      },
      y: { aggregate: 'count', type: 'quantitative', title: 'Requests' },
    },
  },
};

export const layeredExample: VegaNode = {
  type: 'vega',
  title: 'Requests and error rate',
  mode: 'vega-lite',
  width: 560,
  height: 260,
  description: 'Request volume against error rate, each on its own axis.',
  spec: {
    data: {
      values: [
        { hour: '00:00', requests: 1200, errorRate: 0.4 },
        { hour: '04:00', requests: 800, errorRate: 0.3 },
        { hour: '08:00', requests: 2600, errorRate: 0.9 },
        { hour: '12:00', requests: 3400, errorRate: 1.6 },
        { hour: '16:00', requests: 3100, errorRate: 1.1 },
        { hour: '20:00', requests: 2100, errorRate: 0.6 },
      ],
    },
    encoding: { x: { field: 'hour', type: 'ordinal', title: null } },
    layer: [
      {
        mark: { type: 'bar', opacity: 0.7 },
        encoding: {
          y: { field: 'requests', type: 'quantitative', title: 'Requests' },
        },
      },
      {
        mark: { type: 'line', point: true, color: '#EE72A6' },
        encoding: {
          y: {
            field: 'errorRate',
            type: 'quantitative',
            title: 'Error rate (%)',
          },
        },
      },
    ],
    resolve: { scale: { y: 'independent' } },
  },
};

export const facetExample: VegaNode = {
  type: 'vega',
  title: 'Errors by region and service',
  mode: 'vega-lite',
  width: 600,
  height: 240,
  description: 'Each region’s error mix by service, side by side.',
  spec: {
    data: {
      values: ['EMEA', 'AMER', 'APAC'].flatMap((region, r) =>
        ['cart', 'payment', 'search'].map((service, s) => ({
          region,
          service,
          errors: 10 + ((r * 7 + s * 13) % 30),
        }))
      ),
    },
    facet: { column: { field: 'region', type: 'nominal', title: null } },
    spec: {
      width: 150,
      height: 150,
      mark: 'bar',
      encoding: {
        x: { field: 'service', type: 'nominal', title: null },
        y: { field: 'errors', type: 'quantitative' },
        color: { field: 'service', type: 'nominal', legend: null },
      },
    },
  },
};

export const heatmapExample: VegaNode = {
  type: 'vega',
  title: 'Errors by day and hour',
  mode: 'vega-lite',
  width: 520,
  height: 240,
  description: 'Errors cluster on weekday afternoons.',
  spec: {
    data: {
      values: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap(
        (day, d) =>
          ['00', '04', '08', '12', '16', '20'].map((hour, h) => ({
            day,
            hour,
            errors:
              d < 5 && (h === 3 || h === 4) ? 30 + d * 3 : 4 + ((d + h) % 5),
          }))
      ),
    },
    mark: 'rect',
    encoding: {
      x: { field: 'hour', type: 'ordinal', title: 'Hour' },
      y: { field: 'day', type: 'ordinal', sort: null, title: null },
      color: { field: 'errors', type: 'quantitative' },
    },
  },
};

export const donutExample: VegaNode = {
  type: 'vega',
  title: 'Errors by service',
  mode: 'vega-lite',
  width: 360,
  height: 240,
  description: 'Payment errors are most of the total.',
  spec: {
    data: {
      values: [
        { service: 'payment', errors: 58 },
        { service: 'cart', errors: 21 },
        { service: 'search', errors: 13 },
        { service: 'auth', errors: 8 },
      ],
    },
    mark: { type: 'arc', innerRadius: 50 },
    encoding: {
      theta: { field: 'errors', type: 'quantitative' },
      color: { field: 'service', type: 'nominal', sort: null },
    },
  },
};

/** A signal bound to an input: the server draws its default, and a hydrated chart lets a reader move it. */
export const signalExample: VegaNode = {
  type: 'vega',
  title: 'Hosts over the CPU threshold',
  mode: 'vega',
  width: 480,
  height: 240,
  description: 'Hosts above the CPU threshold are highlighted.',
  spec: {
    signals: [
      {
        name: 'threshold',
        value: 70,
        bind: { input: 'range', min: 0, max: 100, step: 5 },
      },
    ],
    data: [
      {
        name: 'hosts',
        values: [
          { host: 'web-1', cpu: 42 },
          { host: 'web-2', cpu: 77 },
          { host: 'web-3', cpu: 63 },
          { host: 'db-1', cpu: 91 },
          { host: 'db-2', cpu: 55 },
        ],
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'band',
        domain: { data: 'hosts', field: 'host' },
        range: 'width',
        padding: 0.2,
      },
      { name: 'y', domain: [0, 100], range: 'height' },
    ],
    axes: [
      { orient: 'bottom', scale: 'x' },
      { orient: 'left', scale: 'y', title: 'CPU (%)' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'hosts' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'host' },
            width: { scale: 'x', band: 1 },
            y: { scale: 'y', field: 'cpu' },
            y2: { scale: 'y', value: 0 },
          },
          update: {
            fill: { signal: "datum.cpu > threshold ? '#F6726A' : '#16C5C0'" },
          },
        },
      },
      {
        type: 'rule',
        encode: {
          update: {
            x: { value: 0 },
            x2: { signal: 'width' },
            y: { scale: 'y', signal: 'threshold' },
            strokeDash: { value: [4, 4] },
          },
        },
      },
    ],
  },
};

/**
 * A search response inlined whole, with `format.property` naming the buckets,
 * as a host that runs a Kibana panel's query hands it over.
 */
export const searchResponseExample: VegaNode = {
  type: 'vega',
  title: 'Documents per day',
  mode: 'vega',
  width: 560,
  height: 220,
  description: 'Documents per day, read from an inlined search response.',
  spec: {
    data: [
      {
        name: 'timeline',
        values: {
          took: 4,
          aggregations: {
            per_day: {
              buckets: errorsPerDay.map((errors, index) => ({
                key: START + index * DAY,
                doc_count: errors * 10,
              })),
            },
          },
        },
        format: { property: 'aggregations.per_day.buckets' },
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'utc',
        domain: { data: 'timeline', field: 'key' },
        range: 'width',
      },
      {
        name: 'y',
        domain: { data: 'timeline', field: 'doc_count' },
        range: 'height',
        nice: true,
        zero: true,
      },
    ],
    axes: [
      {
        orient: 'bottom',
        scale: 'x',
        format: '%b %d',
        formatType: 'utc',
        labelOverlap: true,
      },
      { orient: 'left', scale: 'y', title: 'Documents' },
    ],
    marks: [
      {
        type: 'area',
        from: { data: 'timeline' },
        encode: {
          enter: {
            x: { scale: 'x', field: 'key' },
            y: { scale: 'y', field: 'doc_count' },
            y2: { scale: 'y', value: 0 },
            interpolate: { value: 'monotone' },
          },
        },
      },
    ],
  },
};

/**
 * A Kibana Vega panel as a materializer hands it over: the query's response
 * inlined at `values` with `format.property` kept, provenance, the link back,
 * and what was lost on the way.
 */
export const kibanaPanelExample: VegaNode = {
  type: 'vega',
  mode: 'vega-lite',
  title: 'Unique visitors by country',
  description: 'Unique visitors by country over the last 7 days, China first.',
  width: 480,
  height: 240,
  source: {
    host: 'kibana',
    hostVersion: '9.4.0',
    capturedAt: '2026-03-15T00:00:00Z',
    timeRange: { from: '2026-03-08T00:00:00Z', to: '2026-03-15T00:00:00Z' },
    meta: { savedObjectId: 'vega-visitors', panelIndex: '3' },
  },
  losses: [
    {
      path: 'signals[0].on[0].update',
      kind: 'dropped',
      note: '`kibanaAddFilter` on click: the materializer removed it.',
    },
  ],
  interactions: {
    link: {
      href: 'https://kibana.example.com/app/dashboards#/view/web-logs',
      label: 'Open in Kibana',
    },
  },
  spec: {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config: { kibana: { hideWarnings: true } },
    data: {
      values: {
        took: 7,
        aggregations: {
          countries: {
            buckets: [
              { key: 'CN', doc_count: 1830, unique: { value: 812 } },
              { key: 'IN', doc_count: 1512, unique: { value: 671 } },
              { key: 'US', doc_count: 1105, unique: { value: 502 } },
              { key: 'ID', doc_count: 402, unique: { value: 188 } },
              { key: 'BR', doc_count: 371, unique: { value: 160 } },
            ],
          },
        },
      },
      format: { property: 'aggregations.countries.buckets' },
    },
    mark: 'bar',
    encoding: {
      y: { field: 'key', type: 'nominal', sort: '-x', title: null },
      x: {
        field: 'unique.value',
        type: 'quantitative',
        title: 'Unique visitors',
      },
    },
  },
};

/**
 * Kibana map mode as a materializer converts it: a Mercator projection at the
 * saved center and zoom, over boundaries it inlined, with no tiles.
 */
export const mapExample: VegaNode = {
  type: 'vega',
  mode: 'vega',
  title: 'Requests by region',
  description: 'Requests by region, most from the west region.',
  width: 480,
  height: 270,
  losses: [
    {
      path: 'config.kibana',
      kind: 'approximated',
      note: 'The EMS basemap tiles are drawn as inlined boundaries.',
    },
  ],
  spec: {
    projections: [
      {
        name: 'projection',
        type: 'mercator',
        fit: { signal: "data('regions')" },
        size: { signal: '[width, height]' },
      },
    ],
    data: [
      {
        name: 'regions',
        values: [
          {
            name: 'West',
            requests: 4200,
            ring: [
              [-12, 36],
              [3, 36],
              [3, 51],
              [-12, 51],
            ],
          },
          {
            name: 'Central',
            requests: 2600,
            ring: [
              [3, 40],
              [18, 40],
              [18, 55],
              [3, 55],
            ],
          },
          {
            name: 'East',
            requests: 1100,
            ring: [
              [18, 42],
              [33, 42],
              [33, 58],
              [18, 58],
            ],
          },
        ].map(({ name, requests, ring }) => ({
          type: 'Feature',
          properties: { name, requests },
          // Clockwise, as d3-geo reads an exterior ring on the sphere.
          geometry: {
            type: 'Polygon',
            coordinates: [[...ring, ring[0]].reverse()],
          },
        })),
      },
    ],
    scales: [
      {
        name: 'color',
        type: 'linear',
        domain: { data: 'regions', field: 'properties.requests' },
        range: { scheme: 'blues' },
      },
    ],
    legends: [{ fill: 'color', title: 'Requests', orient: 'right' }],
    marks: [
      {
        type: 'shape',
        from: { data: 'regions' },
        encode: {
          update: {
            fill: { scale: 'color', field: 'properties.requests' },
            stroke: { value: '#FFFFFF' },
            strokeWidth: { value: 1 },
          },
        },
        transform: [{ type: 'geoshape', projection: 'projection' }],
      },
    ],
  },
};

/** Every example the Studio, conformance, and the docs show. */
export const vegaExamples: PrimitiveExample<VegaNode>[] = [
  { name: 'Bars from a typed table', node: vegaExample },
  { name: 'Brush over a time column', node: brushExample },
  { name: 'Time series with a timestamp domain', node: timeSeriesExample },
  { name: 'Binned histogram', node: histogramExample },
  { name: 'Layered bars and line on two axes', node: layeredExample },
  { name: 'Faceted small multiples', node: facetExample },
  { name: 'Heatmap with a color legend', node: heatmapExample },
  { name: 'Donut', node: donutExample },
  { name: 'Vega bar chart', node: vegaGrammarExample },
  { name: 'Vega signal bound to an input', node: signalExample },
  { name: 'Inlined search response', node: searchResponseExample },
  { name: 'Kibana panel, materialized', node: kibanaPanelExample },
  { name: 'Kibana map mode, materialized', node: mapExample },
];
