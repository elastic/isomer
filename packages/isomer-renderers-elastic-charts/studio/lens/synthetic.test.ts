/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { plan } from '@elastic/isomer-lowering-lens';
import { describe, expect, it } from 'vitest';

import { maxColumns } from './hints';
import { MAX_SYNTHETIC_ROWS, synthesize } from './synthetic';

const esql = (
  columns: { columnId: string; fieldName: string; type: string }[],
  visualization: Record<string, unknown> = {}
) => {
  const planned = plan({
    savedObject: {
      id: 'synthetic',
      type: 'lens',
      references: [],
      attributes: {
        title: 'Synthetic',
        visualizationType: 'lnsMetric',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer: {
                  query: { esql: 'FROM logs' },
                  columns: columns.map(({ columnId, fieldName, type }) => ({
                    columnId,
                    fieldName,
                    meta: { type },
                  })),
                },
              },
            },
          },
          visualization: {
            layerId: 'layer',
            layerType: 'data',
            metricAccessor: 'value',
            ...visualization,
          },
        },
      },
    },
  });
  if (planned.status !== 'planned') {
    throw new Error(JSON.stringify(planned.diagnostics));
  }
  return planned.plan;
};

describe('synthesize', () => {
  it('refuses a layer whose bucket columns make too many rows, before building any', () => {
    const dates = Array.from({ length: 8 }, (_, index) => ({
      columnId: `time${index}`,
      fieldName: `time${index}`,
      type: 'date',
    }));
    const [only] = synthesize(esql(dates), {
      seed: 'isomer',
      maxColumns: new Set(),
    });
    const { result } = only!;
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.diagnostics).toEqual([
      {
        code: 'studio.synthetic.too-many-rows',
        message: `Synthetic data for this layer would have ${12 ** 8} rows, more than ${MAX_SYNTHETIC_ROWS}.`,
        path: ['layers', 'layer'],
      },
    ]);
  });

  it('builds a table within the limit', () => {
    const [only] = synthesize(
      esql([
        { columnId: 'time', fieldName: 'time', type: 'date' },
        { columnId: 'value', fieldName: 'value', type: 'number' },
      ]),
      { seed: 'isomer', maxColumns: new Set() }
    );
    expect(
      only!.result.status === 'ready' && only!.result.table.rows
    ).toHaveLength(12);
  });
});

describe('maxColumns', () => {
  it("names a metric's ES|QL max column by the field it reads", () => {
    expect(
      maxColumns(
        esql(
          [
            { columnId: 'value', fieldName: 'value', type: 'number' },
            { columnId: 'goal', fieldName: 'goal_field', type: 'number' },
          ],
          { maxAccessor: 'goal' }
        )
      )
    ).toEqual(new Set(['goal_field']));
  });
});
