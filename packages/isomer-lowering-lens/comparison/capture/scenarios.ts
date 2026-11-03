/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Dashboards authored for comparison: edge and common cases the sample dashboards do not draw,
// built on the sample data so any local Kibana can render them.

import { delayed, delayedVsLastWeek } from '../../src/form/flights.fixtures';

type Json = Record<string, unknown>;

export interface AuthoredPanel {
  panelIndex: string;
  /** Grid width and height in dashboard units (48 columns). */
  size: [number, number];
  attributes: Json;
}

export interface AuthoredDashboard {
  id: string;
  title: string;
  panels: AuthoredPanel[];
}

export const DATA_VIEWS = {
  flights: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
  logs: '90943e30-9a47-11e8-b64d-95841ca0b247',
} as const;

const FLIGHTS = 'FROM kibana_sample_data_flights';
const LOGS = 'FROM kibana_sample_data_logs';

const lens = (title: string, state: Json, references: Json[] = []): Json => ({
  title,
  description: '',
  visualizationType: 'lnsMetric',
  type: 'lens',
  references,
  state: { query: { query: '', language: 'kuery' }, filters: [], ...state },
});

/** A form-based metric over one Flights layer named `layer`. */
const form = (
  title: string,
  columns: Record<string, Json>,
  visualization: Json,
  query?: Json
) =>
  lens(
    title,
    {
      ...(query ? { query } : {}),
      datasourceStates: {
        formBased: {
          layers: { layer: { columnOrder: Object.keys(columns), columns } },
        },
      },
      visualization: { layerId: 'layer', layerType: 'data', ...visualization },
    },
    [
      {
        type: 'index-pattern',
        id: DATA_VIEWS.flights,
        name: 'indexpattern-datasource-layer-layer',
      },
    ]
  );

/** A native ES|QL metric with one layer named `layer`. */
const esql = (
  title: string,
  query: string,
  columns: Json[],
  visualization: Json
) =>
  lens(title, {
    query: { esql: query },
    datasourceStates: {
      textBased: { layers: { layer: { query: { esql: query }, columns } } },
    },
    visualization: { layerId: 'layer', layerType: 'data', ...visualization },
  });

const count = (label = 'Flights'): Json => ({
  operationType: 'count',
  label,
  customLabel: true,
  dataType: 'number',
  isBucketed: false,
  scale: 'ratio',
  sourceField: '___records___',
});

const metric = (
  operationType: string,
  sourceField: string,
  label: string,
  format?: Json
): Json => ({
  operationType,
  label,
  customLabel: true,
  dataType: 'number',
  isBucketed: false,
  scale: 'ratio',
  sourceField,
  ...(format ? { params: { format } } : {}),
});

const terms = (
  sourceField: string,
  size: number,
  orderBy: string,
  otherBucket = false
): Json => ({
  operationType: 'terms',
  label: `Top ${size} values of ${sourceField}`,
  dataType: 'string',
  isBucketed: true,
  scale: 'ordinal',
  sourceField,
  params: {
    size,
    orderBy: { type: 'column', columnId: orderBy },
    orderDirection: 'desc',
    otherBucket,
    missingBucket: false,
  },
});

const staticValue = (value: number): Json => ({
  operationType: 'static_value',
  label: `Static value: ${value}`,
  dataType: 'number',
  isBucketed: false,
  scale: 'ratio',
  references: [],
  params: { value: String(value) },
});

const esqlNumber = (columnId: string, label?: string, format?: Json): Json => ({
  columnId,
  fieldName: columnId,
  meta: { type: 'number' },
  ...(label ? { label, customLabel: true } : {}),
  ...(format ? { params: { format } } : {}),
});

const STATUS_PALETTE = {
  type: 'palette',
  name: 'status',
  params: {
    name: 'status',
    reverse: false,
    rangeType: 'percent',
    rangeMin: 0,
    rangeMax: 100,
    progression: 'fixed',
    stops: [
      { color: '#24c292', stop: 33.33 },
      { color: '#fcd883', stop: 66.66 },
      { color: '#f6726a', stop: 100 },
    ],
    steps: 3,
    colorStops: [],
    continuity: 'all',
    maxSteps: 5,
  },
};

const fixture = (
  input: () => { savedObject: { attributes: Json } },
  title: string
): Json => {
  const { attributes } = input().savedObject;
  const state = attributes.state as Json;
  const layers = Object.keys(
    ((state.datasourceStates as Json).formBased as { layers: Json }).layers
  );
  return {
    ...attributes,
    title,
    type: 'lens',
    references: layers.map((layerId) => ({
      type: 'index-pattern',
      id: DATA_VIEWS.flights,
      name: `indexpattern-datasource-layer-${layerId}`,
    })),
  };
};

/** A form-based metric with the trendline layer Lens's editor links to it. */
const trendline = (): Json =>
  lens(
    'Average ticket price',
    {
      datasourceStates: {
        formBased: {
          layers: {
            main: {
              columnOrder: ['price'],
              columns: {
                price: metric(
                  'average',
                  'AvgTicketPrice',
                  'Average ticket price',
                  {
                    id: 'number',
                    params: { decimals: 2, suffix: ' USD' },
                  }
                ),
              },
            },
            trend: {
              linkToLayers: ['main'],
              columnOrder: ['time', 'trendPrice'],
              columns: {
                time: {
                  operationType: 'date_histogram',
                  label: 'timestamp',
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                  sourceField: 'timestamp',
                  params: { interval: 'auto', includeEmptyRows: true },
                },
                trendPrice: metric(
                  'average',
                  'AvgTicketPrice',
                  'Average of AvgTicketPrice'
                ),
              },
            },
          },
        },
      },
      visualization: {
        layerId: 'main',
        layerType: 'data',
        metricAccessor: 'price',
        subtitle: 'Across all carriers',
        color: '#D6E5FF',
        trendlineLayerId: 'trend',
        trendlineLayerType: 'metricTrendline',
        trendlineTimeAccessor: 'time',
        trendlineMetricAccessor: 'trendPrice',
      },
    },
    ['main', 'trend'].map((layerId) => ({
      type: 'index-pattern',
      id: DATA_VIEWS.flights,
      name: `indexpattern-datasource-layer-${layerId}`,
    }))
  );

const flightsPanels: AuthoredPanel[] = [
  { panelIndex: 'trendline', size: [12, 8], attributes: trendline() },
  {
    panelIndex: 'count',
    size: [12, 8],
    attributes: form('Count', { count: count() }, { metricAccessor: 'count' }),
  },
  {
    panelIndex: 'percent-formula',
    size: [12, 8],
    attributes: fixture(delayed, 'Delayed share'),
  },
  {
    panelIndex: 'shifted-secondary',
    size: [12, 8],
    attributes: fixture(delayedVsLastWeek, 'Delayed vs last week'),
  },
  {
    panelIndex: 'decimals-suffix',
    size: [12, 8],
    attributes: form(
      'Average ticket price',
      {
        price: metric('average', 'AvgTicketPrice', 'Ticket price', {
          id: 'number',
          params: { decimals: 2, suffix: ' USD' },
        }),
      },
      { metricAccessor: 'price' }
    ),
  },
  {
    panelIndex: 'secondary-metric',
    size: [12, 8],
    attributes: form(
      'Delay',
      {
        delay: metric('average', 'FlightDelayMin', 'Average delay', {
          id: 'number',
          params: { decimals: 1, suffix: ' min' },
        }),
        worst: metric('max', 'FlightDelayMin', 'Worst'),
      },
      {
        metricAccessor: 'delay',
        secondaryMetricAccessor: 'worst',
        subtitle: 'All carriers',
      }
    ),
  },
  {
    panelIndex: 'breakdown-grid',
    size: [24, 12],
    attributes: form(
      'Flights by carrier',
      { carrier: terms('Carrier', 4, 'count'), count: count() },
      { metricAccessor: 'count', breakdownByAccessor: 'carrier', maxCols: 2 }
    ),
  },
  {
    panelIndex: 'breakdown-other-empty-cells',
    size: [24, 12],
    attributes: form(
      'Flights by destination',
      { country: terms('DestCountry', 4, 'count', true), count: count() },
      { metricAccessor: 'count', breakdownByAccessor: 'country', maxCols: 3 }
    ),
  },
  {
    panelIndex: 'progress-horizontal',
    size: [12, 8],
    attributes: form(
      'Flights against target',
      { count: count(), max: staticValue(20000) },
      {
        metricAccessor: 'count',
        maxAccessor: 'max',
        showBar: true,
        progressDirection: 'horizontal',
      }
    ),
  },
  {
    panelIndex: 'progress-vertical-overflow',
    size: [12, 8],
    attributes: form(
      'Flights over target',
      { count: count(), max: staticValue(500) },
      {
        metricAccessor: 'count',
        maxAccessor: 'max',
        showBar: true,
        progressDirection: 'vertical',
      }
    ),
  },
  {
    panelIndex: 'static-color',
    size: [12, 8],
    attributes: form(
      'Cancelled',
      { count: count('Cancelled') },
      { metricAccessor: 'count', color: '#F6726A' },
      {
        query: 'Cancelled : true',
        language: 'kuery',
      }
    ),
  },
  {
    panelIndex: 'status-palette',
    size: [24, 8],
    attributes: form(
      'Delay by carrier',
      {
        carrier: terms('Carrier', 3, 'delay'),
        delay: metric('average', 'FlightDelayMin', 'Average delay'),
      },
      {
        metricAccessor: 'delay',
        breakdownByAccessor: 'carrier',
        maxCols: 3,
        palette: STATUS_PALETTE,
      }
    ),
  },
  {
    panelIndex: 'icon-centered-top',
    size: [12, 8],
    attributes: form(
      'Distance',
      {
        distance: metric('sum', 'DistanceKilometers', 'Total distance', {
          id: 'number',
          params: { decimals: 0, compact: true },
        }),
      },
      {
        metricAccessor: 'distance',
        icon: 'globe',
        iconAlign: 'right',
        titlesTextAlign: 'center',
        primaryAlign: 'center',
        primaryPosition: 'top',
      }
    ),
  },
  {
    panelIndex: 'compact-density',
    size: [12, 6],
    attributes: form(
      'Compact',
      { count: count() },
      { metricAccessor: 'count', density: 'compact', subtitle: 'Dense layout' }
    ),
  },
  {
    panelIndex: 'empty-result',
    size: [12, 8],
    attributes: form(
      'No matching flights',
      { delay: metric('average', 'FlightDelayMin', 'Average delay') },
      { metricAccessor: 'delay' },
      { query: 'Carrier : "No such carrier"', language: 'kuery' }
    ),
  },
  {
    panelIndex: 'long-title',
    size: [8, 6],
    attributes: form(
      'A deliberately long panel title that cannot fit in a narrow tile and has to truncate',
      {
        count: count(
          'A deliberately long metric label that also has to truncate somewhere'
        ),
      },
      {
        metricAccessor: 'count',
        subtitle: 'And a subtitle long enough to wrap or truncate as well',
      }
    ),
  },
];

const logsPanels: AuthoredPanel[] = [
  {
    panelIndex: 'esql-negative',
    size: [12, 8],
    attributes: esql(
      'Net change',
      `${LOGS} | STATS change = 0 - COUNT(*)`,
      [esqlNumber('change', 'Change')],
      { metricAccessor: 'change' }
    ),
  },
  {
    panelIndex: 'esql-huge-bytes',
    size: [12, 8],
    attributes: esql(
      'Huge',
      `${LOGS} | STATS total = SUM(bytes) * 1000000000`,
      [esqlNumber('total', 'Bytes', { id: 'bytes', params: { decimals: 2 } })],
      { metricAccessor: 'total' }
    ),
  },
  {
    panelIndex: 'esql-tiny',
    size: [12, 8],
    attributes: esql(
      'Tiny',
      `${LOGS} | STATS share = 1.0 / COUNT(*)`,
      [
        esqlNumber('share', 'Share of one request', {
          id: 'number',
          params: { decimals: 6 },
        }),
      ],
      { metricAccessor: 'share' }
    ),
  },
  {
    panelIndex: 'esql-null',
    size: [12, 8],
    attributes: esql(
      'Nothing',
      `${LOGS} | WHERE bytes < 0 | STATS avg = AVG(bytes)`,
      [esqlNumber('avg', 'Average bytes')],
      {
        metricAccessor: 'avg',
      }
    ),
  },
  {
    panelIndex: 'esql-multivalue',
    size: [12, 8],
    attributes: esql(
      'Extensions',
      `${LOGS} | WHERE extension.keyword IN ("css", "deb", "gz") | STATS extensions = MV_SORT(VALUES(extension.keyword))`,
      [
        {
          columnId: 'extensions',
          fieldName: 'extensions',
          label: 'Extensions',
          customLabel: true,
          meta: { type: 'string' },
        },
      ],
      { metricAccessor: 'extensions' }
    ),
  },
  {
    panelIndex: 'esql-date-value',
    size: [12, 8],
    attributes: esql(
      'Latest request',
      `${LOGS} | STATS latest = MAX(@timestamp)`,
      [
        {
          columnId: 'latest',
          fieldName: 'latest',
          label: 'Latest',
          customLabel: true,
          meta: { type: 'date' },
        },
      ],
      { metricAccessor: 'latest' }
    ),
  },
  {
    panelIndex: 'esql-breakdown-compare',
    size: [24, 12],
    attributes: esql(
      'Bytes by host',
      `${LOGS} | STATS bytes = SUM(bytes), median = MEDIAN(bytes) BY host.keyword`,
      [
        {
          columnId: 'host',
          fieldName: 'host.keyword',
          meta: { type: 'string' },
        },
        esqlNumber('bytes', 'Bytes', { id: 'bytes', params: { decimals: 1 } }),
        esqlNumber('median', 'Median', {
          id: 'bytes',
          params: { decimals: 1 },
        }),
      ],
      {
        metricAccessor: 'bytes',
        secondaryMetricAccessor: 'median',
        breakdownByAccessor: 'host',
        maxCols: 2,
        secondaryTrend: {
          type: 'dynamic',
          visuals: 'both',
          paletteId: 'compare_to',
          reversed: false,
          baselineValue: 'primary',
        },
      }
    ),
  },
  {
    panelIndex: 'esql-flights-max',
    size: [12, 8],
    attributes: esql(
      'Average delay of the worst',
      `${FLIGHTS} | STATS delay = AVG(FlightDelayMin), worst = MAX(FlightDelayMin)`,
      [esqlNumber('delay', 'Average delay'), esqlNumber('worst', 'Worst')],
      { metricAccessor: 'delay', maxAccessor: 'worst', showBar: true }
    ),
  },
];

export const AUTHORED_DASHBOARDS: readonly AuthoredDashboard[] = [
  {
    id: 'isomer-comparison-metric-flights',
    title: 'Isomer comparison: metric (Flights)',
    panels: flightsPanels,
  },
  {
    id: 'isomer-comparison-metric-logs',
    title: 'Isomer comparison: metric (Logs, ES|QL)',
    panels: logsPanels,
  },
];

/** A dashboard saved object for `_import`, with every panel by value. */
export const dashboardSavedObject = ({
  id,
  title,
  panels,
}: AuthoredDashboard): Json => {
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const placed = panels.map(({ panelIndex, size: [w, h], attributes }) => {
    if (x + w > 48) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    const gridData = { x, y, w, h, i: panelIndex };
    x += w;
    rowHeight = Math.max(rowHeight, h);
    return {
      version: '8.9.0',
      type: 'lens',
      panelIndex,
      gridData,
      embeddableConfig: { attributes, enhancements: {} },
    };
  });
  return {
    id,
    type: 'dashboard',
    // Without these, import migrates the panels from a pre-8 shape and fails.
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.3.0',
    attributes: {
      title,
      description:
        'Authored by @elastic/isomer-lowering-lens for comparison captures.',
      panelsJSON: JSON.stringify(placed),
      optionsJSON: JSON.stringify({
        useMargins: true,
        syncColors: false,
        hidePanelTitles: false,
      }),
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
        }),
      },
    },
    references: panels.flatMap(({ panelIndex, attributes }) =>
      ((attributes.references as Json[]) ?? []).map((reference) => ({
        ...reference,
        name: `${panelIndex}:${String(reference.name)}`,
      }))
    ),
  };
};
