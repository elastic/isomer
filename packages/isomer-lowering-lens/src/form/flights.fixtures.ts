/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Metric panels of Kibana's "[Flights] Global Flight Dashboard" sample, as the
// dashboard export saves them by value, wrapped as Lens saved objects.

export const totalFlights = () => ({
  savedObject: {
    id: 'totalFlights',
    type: 'lens',
    attributes: {
      title: '[Flights] Total Flights',
      description: '',
      visualizationType: 'lnsMetric',
      state: {
        visualization: {
          layerId: '8fa993db-c147-4954-adf7-4ff264d42576',
          layerType: 'data',
          metricAccessor: '81124c45-6ab6-42f4-8859-495d55eb8065',
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              '8fa993db-c147-4954-adf7-4ff264d42576': {
                columns: {
                  '81124c45-6ab6-42f4-8859-495d55eb8065': {
                    label: 'Total flights',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                  },
                },
                columnOrder: ['81124c45-6ab6-42f4-8859-495d55eb8065'],
                incompleteColumns: {},
              },
            },
          },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576',
      },
    ],
  },
});

export const delayed = () => ({
  savedObject: {
    id: 'delayed',
    type: 'lens',
    attributes: {
      title: '',
      visualizationType: 'lnsMetric',
      state: {
        visualization: {
          layerId: 'b4712d43-1e84-4f5b-878d-8e38ba748317',
          layerType: 'data',
          metricAccessor: '7e8fe9b1-f45c-4f3d-9561-30febcd357ec',
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              'b4712d43-1e84-4f5b-878d-8e38ba748317': {
                columns: {
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ec': {
                    label: 'Delayed',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      formula: "count(kql='FlightDelay : true') / count()",
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 1,
                          compact: true,
                        },
                      },
                    },
                    references: ['7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2'],
                    customLabel: true,
                  },
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0': {
                    label: "Part of count(kql='FlightDelay : true') / count()",
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    filter: {
                      query: 'FlightDelay : true',
                      language: 'kuery',
                    },
                    customLabel: true,
                  },
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1': {
                    label: "Part of count(kql='FlightDelay : true') / count()",
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                  },
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2': {
                    label: "Part of count(kql='FlightDelay : true') / count()",
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      tinymathAst: {
                        type: 'function',
                        name: 'divide',
                        args: [
                          '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0',
                          '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1',
                        ],
                        location: {
                          min: 0,
                          max: 41,
                        },
                        text: "count(kql='FlightDelay : true') / count()",
                      },
                    },
                    references: [
                      '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0',
                      '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1',
                    ],
                    customLabel: true,
                  },
                },
                columnOrder: [
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ec',
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX0',
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX1',
                  '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2',
                ],
                incompleteColumns: {},
              },
            },
          },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
    ],
  },
});

export const delayedVsLastWeek = () => ({
  savedObject: {
    id: 'delayedVsLastWeek',
    type: 'lens',
    attributes: {
      title: '',
      visualizationType: 'lnsMetric',
      state: {
        visualization: {
          layerId: 'b4712d43-1e84-4f5b-878d-8e38ba748317',
          layerType: 'data',
          metricAccessor: 'c7851241-5526-499a-960b-357af8c2ce5b',
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'FlightDelay',
              params: {
                query: true,
              },
              index: 'c804c161-375f-4d52-a1cc-2e98b966957d',
            },
            query: {
              match_phrase: {
                FlightDelay: true,
              },
            },
            $state: {
              store: 'appState',
            },
          },
        ],
        datasourceStates: {
          formBased: {
            layers: {
              'b4712d43-1e84-4f5b-878d-8e38ba748317': {
                columns: {
                  'c7851241-5526-499a-960b-357af8c2ce5b': {
                    label: 'Delayed vs 1 week earlier',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      formula: "count() / count(shift='1w') - 1",
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 1,
                          compact: true,
                        },
                      },
                    },
                    references: ['c7851241-5526-499a-960b-357af8c2ce5bX2'],
                    customLabel: true,
                  },
                  'c7851241-5526-499a-960b-357af8c2ce5bX2': {
                    label: 'Part of Delayed',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      tinymathAst: {
                        type: 'function',
                        name: 'subtract',
                        args: [
                          {
                            type: 'function',
                            name: 'divide',
                            args: [
                              'c7851241-5526-499a-960b-357af8c2ce5bX0',
                              'c7851241-5526-499a-960b-357af8c2ce5bX1',
                            ],
                            location: {
                              min: 0,
                              max: 28,
                            },
                            text: "count() / count(shift='1w') ",
                          },
                          1,
                        ],
                        location: {
                          min: 0,
                          max: 31,
                        },
                        text: "count() / count(shift='1w') - 1",
                      },
                    },
                    references: [
                      'c7851241-5526-499a-960b-357af8c2ce5bX0',
                      'c7851241-5526-499a-960b-357af8c2ce5bX1',
                    ],
                    customLabel: true,
                  },
                  'c7851241-5526-499a-960b-357af8c2ce5bX0': {
                    label: 'Part of Delayed',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                  },
                  'c7851241-5526-499a-960b-357af8c2ce5bX1': {
                    label: 'Part of Delayed',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    timeShift: '1w',
                    customLabel: true,
                  },
                },
                columnOrder: [
                  'c7851241-5526-499a-960b-357af8c2ce5b',
                  'c7851241-5526-499a-960b-357af8c2ce5bX2',
                  'c7851241-5526-499a-960b-357af8c2ce5bX0',
                  'c7851241-5526-499a-960b-357af8c2ce5bX1',
                ],
                incompleteColumns: {},
              },
            },
          },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        name: 'indexpattern-datasource-layer-b4712d43-1e84-4f5b-878d-8e38ba748317',
      },
      {
        type: 'index-pattern',
        name: 'c804c161-375f-4d52-a1cc-2e98b966957d',
        id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      },
    ],
  },
});
