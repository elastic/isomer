/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { plan } from '../plan';
import type { FormLayerPlan, LensPlanResult } from '../schema';

import { delayed, delayedVsLastWeek, totalFlights } from './flights.fixtures';

const FLIGHTS_VIEW = 'd3d7af60-4c81-11e8-b3d7-01146121b73d';
const metadata = {
  id: FLIGHTS_VIEW,
  title: 'kibana_sample_data_flights',
  timeFieldName: 'timestamp',
};

const planned = (result: LensPlanResult) => {
  if (result.status !== 'planned') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.plan;
};

const formLayer = (result: LensPlanResult) =>
  planned(result).layers[0] as FormLayerPlan;

const codes = (result: LensPlanResult) =>
  result.status === 'planned' ? [] : result.diagnostics.map(({ code }) => code);

type Fixture = ReturnType<typeof delayed>;

/** The Delayed panel's single layer, for editing. */
const layerOf = (input: Fixture) =>
  Object.values(
    (
      input.savedObject.attributes.state.datasourceStates as {
        formBased: {
          layers: Record<
            string,
            {
              columns: Record<string, Record<string, unknown>>;
              columnOrder: string[];
            }
          >;
        };
      }
    ).formBased.layers
  )[0]!;

const MATH = '7e8fe9b1-f45c-4f3d-9561-30febcd357ecX2';
const FORMULA = '7e8fe9b1-f45c-4f3d-9561-30febcd357ec';

describe('plan: form-based Lens', () => {
  it('plans the "Total flights" count against its data view', () => {
    const layer = formLayer(plan(totalFlights()));
    expect(layer).toMatchObject({
      kind: 'form',
      layerId: '8fa993db-c147-4954-adf7-4ff264d42576',
      dataView: FLIGHTS_VIEW,
      columns: [
        {
          columnId: '81124c45-6ab6-42f4-8859-495d55eb8065',
          operationType: 'count',
          sourceField: '___records___',
          label: 'Total flights',
          customLabel: true,
        },
      ],
      host: {
        timeField: null,
        applyFilters: true,
        sampling: 1,
        needs: ['dataView'],
      },
    });
  });

  it('takes the time field from supplied metadata, which makes the time range a need', () => {
    const layer = formLayer(plan({ ...totalFlights(), dataViews: [metadata] }));
    expect(layer.host).toEqual({
      timeField: 'timestamp',
      applyFilters: true,
      sampling: 1,
      needs: ['timeRange'],
    });
  });

  it('keeps a formula’s columns in Lens order and the saved query', () => {
    const result = planned(plan(delayed()));
    expect(result.query).toEqual({ query: '', language: 'kuery' });
    expect(
      (result.layers[0] as FormLayerPlan).columns.map(
        ({ columnId, operationType }) => [columnId, operationType]
      )
    ).toEqual([
      [FORMULA, 'formula'],
      [`${FORMULA}X0`, 'count'],
      [`${FORMULA}X1`, 'count'],
      [MATH, 'math'],
    ]);
  });

  it('carries a shifted formula’s saved filter and needs the time range', () => {
    const result = planned(
      plan({ ...delayedVsLastWeek(), dataViews: [metadata] })
    );
    expect(result.filters).toHaveLength(1);
    expect((result.layers[0] as FormLayerPlan).host.needs).toEqual([
      'timeRange',
    ]);
  });
});

describe('plan: form-based refusals', () => {
  const edit = (
    change: (layer: ReturnType<typeof layerOf>, input: Fixture) => void
  ) => {
    const input = delayed();
    change(layerOf(input), input);
    return plan(input);
  };

  it.each<
    [
      string,
      (layer: ReturnType<typeof layerOf>, input: Fixture) => void,
      string,
    ]
  >([
    [
      'a layer without its data view reference',
      (_, input) => (input.savedObject.references = []),
      'lens.form.missing-data-view',
    ],
    [
      'a math function Lens formulas lack',
      (layer) =>
        ((layer.columns[MATH]!.params as Record<string, unknown>).tinymathAst =
          { type: 'function', name: 'sin', args: [`${FORMULA}X0`] }),
      'lens.form.invalid-math',
    ],
    [
      'a math function named like an inherited property',
      (layer) =>
        ((layer.columns[MATH]!.params as Record<string, unknown>).tinymathAst =
          { type: 'function', name: 'constructor', args: [`${FORMULA}X0`] }),
      'lens.form.invalid-math',
    ],
    [
      'a math function with the wrong arity',
      (layer) =>
        ((layer.columns[MATH]!.params as Record<string, unknown>).tinymathAst =
          { type: 'function', name: 'divide', args: [`${FORMULA}X0`] }),
      'lens.form.invalid-math',
    ],
    [
      'math reading a column it does not reference',
      (layer) =>
        ((layer.columns[MATH]!.params as Record<string, unknown>).tinymathAst =
          'elsewhere'),
      'lens.form.invalid-math',
    ],
    [
      'a formula saved without its AST',
      (layer) => (layer.columns[MATH]!.params = {}),
      'lens.form.invalid-math',
    ],
    [
      'a broken formula',
      (layer) =>
        ((
          layer.columns[FORMULA]!.params as Record<string, unknown>
        ).isFormulaBroken = true),
      'lens.form.broken-formula',
    ],
    [
      'a reference to a missing column',
      (layer) => (layer.columns[MATH]!.references = ['nowhere']),
      'lens.form.missing-reference',
    ],
    [
      'a reference cycle',
      (layer) =>
        (layer.columns[`${FORMULA}X0`] = {
          operationType: 'overall_sum',
          label: 'Overall',
          dataType: 'number',
          isBucketed: false,
          references: [MATH],
        }),
      'lens.form.reference-cycle',
    ],
    [
      'a reference operation without its input',
      (layer) =>
        Object.assign(layer.columns[MATH]!, {
          operationType: 'cumulative_sum',
          references: [],
          params: {},
        }),
      'lens.form.invalid-column',
    ],
    [
      'a column missing from columnOrder',
      (layer) => layer.columnOrder.pop(),
      'lens.form.column-order',
    ],
    [
      'an unknown operation',
      (layer) =>
        (layer.columns[`${FORMULA}X0`]!.operationType = 'future_metric'),
      'lens.form.unsupported-operation',
    ],
    [
      'an incomplete column',
      (layer) =>
        Object.assign(layer, {
          incompleteColumns: { x: { operationType: 'sum' } },
        }),
      'lens.form.incomplete-column',
    ],
  ])('refuses %s', (_, change, code) => {
    expect(codes(edit(change))).toEqual([code]);
  });
});
