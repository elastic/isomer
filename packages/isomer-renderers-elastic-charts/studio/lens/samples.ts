/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  delayed,
  delayedVsLastWeek,
  totalFlights,
} from '../../../isomer-lowering-lens/src/form/flights.fixtures';

const LOGS = 'FROM kibana_sample_data_logs';

/** The "[Logs] Web Traffic" sample's Visits panel, as Kibana saves it. */
const visits = () => ({
  savedObject: {
    id: 'web-traffic-visits',
    type: 'lens',
    references: [],
    attributes: {
      title: 'Visits',
      visualizationType: 'lnsMetric',
      state: {
        query: {
          esql: `${LOGS} | STATS COUNT(*) | RENAME \`COUNT(*)\` as \`Visits\``,
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer: {
                query: {
                  esql: `${LOGS} | STATS COUNT(*) | RENAME \`COUNT(*)\` as \`Visits\``,
                },
                columns: [
                  {
                    columnId: 'Visits',
                    fieldName: 'Visits',
                    meta: { type: 'number', esType: 'long' },
                    inMetricDimension: true,
                  },
                ],
              },
            },
          },
        },
        visualization: {
          layerId: 'layer',
          layerType: 'data',
          metricAccessor: 'Visits',
        },
      },
    },
  },
});

const BY_HOST = `${LOGS} | STATS bytes = SUM(bytes), last_week = SUM(bytes_last_week) BY host.keyword`;
const TREND = `${LOGS} | STATS bytes = SUM(bytes) BY bucket = BUCKET(@timestamp, 1 day), host.keyword`;

/** An ES|QL metric by host with a comparison, a status palette and a sparkline. */
const bytesByHost = () => ({
  savedObject: {
    id: 'bytes-by-host',
    type: 'lens',
    references: [],
    attributes: {
      title: 'Bytes by host',
      visualizationType: 'lnsMetric',
      state: {
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer: {
                query: { esql: BY_HOST },
                columns: [
                  {
                    columnId: 'host',
                    fieldName: 'host.keyword',
                    meta: { type: 'string' },
                  },
                  {
                    columnId: 'bytes',
                    fieldName: 'bytes',
                    label: 'Bytes',
                    customLabel: true,
                    meta: { type: 'number' },
                    params: {
                      format: { id: 'bytes', params: { decimals: 1 } },
                    },
                  },
                  {
                    columnId: 'lastWeek',
                    fieldName: 'last_week',
                    label: 'Last week',
                    customLabel: true,
                    meta: { type: 'number' },
                    params: {
                      format: { id: 'bytes', params: { decimals: 1 } },
                    },
                  },
                ],
              },
              trend: {
                query: { esql: TREND },
                columns: [
                  {
                    columnId: 'time',
                    fieldName: 'bucket',
                    meta: { type: 'date' },
                  },
                  {
                    columnId: 'trendBytes',
                    fieldName: 'bytes',
                    meta: { type: 'number' },
                  },
                  {
                    columnId: 'trendHost',
                    fieldName: 'host.keyword',
                    meta: { type: 'string' },
                  },
                ],
              },
            },
          },
        },
        visualization: {
          layerId: 'layer',
          layerType: 'data',
          metricAccessor: 'bytes',
          secondaryMetricAccessor: 'lastWeek',
          breakdownByAccessor: 'host',
          secondaryTrend: {
            type: 'dynamic',
            visuals: 'both',
            paletteId: 'compare_to',
            reversed: false,
            baselineValue: 'primary',
          },
          palette: {
            type: 'palette',
            name: 'status',
            params: {
              name: 'status',
              rangeType: 'percent',
              steps: 3,
              continuity: 'all',
              stops: [],
            },
          },
          density: 'default',
          trendlineLayerId: 'trend',
          trendlineLayerType: 'metricTrendline',
          trendlineTimeAccessor: 'time',
          trendlineMetricAccessor: 'trendBytes',
          trendlineBreakdownByAccessor: 'trendHost',
        },
      },
    },
  },
});

/** A form-based metric by carrier, with an Other bucket and a static max as a progress bar. */
const flightsByCarrier = () => ({
  savedObject: {
    id: 'flights-by-carrier',
    type: 'lens',
    references: [
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'indexpattern-datasource-layer-layer',
      },
    ],
    attributes: {
      title: 'Flights by carrier',
      visualizationType: 'lnsMetric',
      state: {
        query: { query: '', language: 'kuery' },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              layer: {
                columnOrder: ['carrier', 'count', 'max'],
                columns: {
                  carrier: {
                    operationType: 'terms',
                    label: 'Top 3 values of Carrier',
                    dataType: 'string',
                    isBucketed: true,
                    sourceField: 'Carrier',
                    params: {
                      size: 3,
                      orderBy: { type: 'column', columnId: 'count' },
                      orderDirection: 'desc',
                      otherBucket: true,
                    },
                  },
                  count: {
                    operationType: 'count',
                    label: 'Flights',
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    sourceField: '___records___',
                  },
                  max: {
                    operationType: 'static_value',
                    label: 'Static value: 2000',
                    dataType: 'number',
                    isBucketed: false,
                    references: [],
                    params: { value: '2000' },
                  },
                },
              },
            },
          },
        },
        visualization: {
          layerId: 'layer',
          layerType: 'data',
          metricAccessor: 'count',
          breakdownByAccessor: 'carrier',
          maxAccessor: 'max',
          showBar: true,
          progressDirection: 'horizontal',
          icon: 'globe',
          maxCols: 2,
        },
      },
    },
  },
});

export const SAMPLES = [
  {
    id: 'flights-total',
    title: '[Flights] Total flights: form-based count',
    input: totalFlights,
  },
  {
    id: 'flights-delayed',
    title: '[Flights] Delayed: formula, percent',
    input: delayed,
  },
  {
    id: 'flights-delayed-shift',
    title: '[Flights] Delayed vs a week earlier: shifted formula',
    input: delayedVsLastWeek,
  },
  { id: 'logs-visits', title: '[Logs] Visits: native ES|QL', input: visits },
  {
    id: 'bytes-by-host',
    title: 'Bytes by host: ES|QL breakdown, comparison, palette, trend',
    input: bytesByHost,
  },
  {
    id: 'flights-by-carrier',
    title: 'Flights by carrier: terms with Other, progress, icon',
    input: flightsByCarrier,
  },
] as const;
