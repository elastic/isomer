/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const REQUESTS =
  'FROM logs-*\n| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend\n| STATS requests = COUNT(*) BY service.name';
const LATENCY =
  'FROM traces-* // "?ignored" in a comment\n| STATS p95 = PERCENTILE(duration, 95), hosts = VALUES(host.name) BY service.name';

/** Native ES|QL Lens as Kibana saves it: the global query repeats the single layer's ES|QL. */
export const singleLayerInput = () => ({
  savedObject: {
    id: 'requests-by-service',
    type: 'lens',
    references: [
      { id: 'logs-view', type: 'index-pattern', name: 'textBased-layer1' },
    ],
    attributes: {
      title: 'Requests by service',
      visualizationType: 'lnsXY',
      state: {
        query: { esql: REQUESTS },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: { esql: REQUESTS },
                timeField: '@timestamp',
                columns: [
                  {
                    columnId: 'service',
                    fieldName: 'service.name',
                    meta: { type: 'string' },
                  },
                  {
                    columnId: 'requests',
                    fieldName: 'requests',
                    label: 'Requests',
                    customLabel: true,
                    inMetricDimension: true,
                    meta: { type: 'number' },
                    params: {
                      format: { id: 'number', params: { decimals: 0 } },
                    },
                  },
                ],
              },
            },
          },
        },
        visualization: {
          layers: [
            {
              layerId: 'layer1',
              layerType: 'data',
              xAccessor: 'service',
              accessors: ['requests'],
            },
          ],
        },
      },
    },
  },
  dataViews: [
    { id: 'logs-view', title: 'logs-*', timeFieldName: '@timestamp' },
  ],
});

/** Two layers, one ignoring global filters, a saved filter, and two Lens columns reading one field. */
export const twoLayerInput = () => {
  const { savedObject, dataViews } = singleLayerInput();
  const {
    query: _query,
    datasourceStates,
    ...state
  } = savedObject.attributes.state;
  const layer2 = {
    query: { esql: LATENCY },
    ignoreGlobalFilters: true,
    columns: [
      { columnId: 'p95', fieldName: 'p95', meta: { type: 'number' } },
      { columnId: 'p95-again', fieldName: 'p95', label: 'Latency' },
      { columnId: 'hosts', fieldName: 'hosts', meta: { type: 'string' } },
    ],
  };
  return {
    dataViews,
    savedObject: {
      ...savedObject,
      attributes: {
        ...savedObject.attributes,
        state: {
          ...state,
          filters: [
            {
              meta: { key: 'env', negate: false },
              query: { match_phrase: { env: 'production' } },
            },
          ],
          datasourceStates: {
            textBased: {
              layers: { ...datasourceStates.textBased.layers, layer2 },
            },
          },
        },
      },
    },
  };
};

export const requestsResponse = () => ({
  columns: [
    { name: 'requests', type: 'long' },
    { name: 'service.name', type: 'keyword' },
  ],
  values: [
    [42, 'checkout'],
    [null, 'search'],
  ],
});

export const latencyResponse = () => ({
  columns: [
    { name: 'service.name', type: 'keyword' },
    { name: 'p95', type: 'double' },
    { name: 'hosts', type: 'keyword' },
  ],
  values: [
    ['checkout', 120.5, ['a', 'b']],
    ['search', null, null],
  ],
});
