/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensInspector } from '@elastic/isomer-lowering-lens/inspector';

const input = JSON.stringify(
  {
    savedObject: {
      id: 'synthetic-native-esql',
      type: 'lens',
      attributes: {
        title: 'Synthetic response replay',
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                example: {
                  query: { esql: 'ROW service = "checkout", requests = 42' },
                  columns: [
                    {
                      columnId: 'requests-id',
                      fieldName: 'requests',
                      label: 'Requests',
                    },
                    { columnId: 'service-id', fieldName: 'service' },
                  ],
                },
              },
            },
          },
          visualization: {},
        },
      },
      references: [],
    },
  },
  null,
  2
);
const response = JSON.stringify(
  {
    columns: [
      { name: 'service', type: 'keyword' },
      { name: 'requests', type: 'integer' },
    ],
    values: [
      ['checkout', 42],
      ['search', null],
    ],
  },
  null,
  2
);

export default function LensInspectorApp() {
  return <LensInspector initialInput={input} initialResponse={response} />;
}
