/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Minimal dual-written native Lens shape: ES|QL is saved globally and per layer.
export const nativeEsqlInput = {
  savedObject: {
    id: 'native-esql-lens',
    type: 'lens',
    references: [
      {
        id: 'logs-view',
        type: 'index-pattern',
        name: 'textBased-datasource-layer-layer1',
      },
    ],
    attributes: {
      title: 'Requests by service',
      visualizationType: 'lnsXY',
      state: {
        query: {
          esql: 'FROM logs-*\n| STATS requests = COUNT(*) BY service.name',
        },
        filters: [],
        datasourceStates: {
          textBased: {
            layers: {
              layer1: {
                query: {
                  esql: 'FROM logs-*\n| STATS requests = COUNT(*) BY service.name',
                },
                columns: [
                  {
                    columnId: 'service-id',
                    fieldName: 'service.name',
                    meta: { type: 'string' },
                  },
                  {
                    columnId: 'requests-id',
                    fieldName: 'requests',
                    meta: { type: 'number' },
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
              xAccessor: 'service-id',
              accessors: ['requests-id'],
            },
          ],
        },
      },
    },
  },
};
