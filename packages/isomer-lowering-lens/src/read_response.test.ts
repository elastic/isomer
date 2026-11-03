/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  latencyResponse,
  requestsResponse,
  singleLayerInput,
  twoLayerInput,
} from './native_esql.fixtures';
import { plan } from './plan';
import { readResponse } from './read_response';
import type { LensLayerPlan } from './schema';

const layers = (input: unknown): readonly LensLayerPlan[] => {
  const result = plan(input);
  if (result.status !== 'planned') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.plan.layers;
};

const [requests] = layers(singleLayerInput());
const [, latency] = layers(twoLayerInput());

describe('readResponse', () => {
  it('projects by field name into Lens order, keeping nulls', () => {
    expect(readResponse(requests, requestsResponse())).toEqual({
      status: 'ready',
      table: {
        layerId: 'layer1',
        columns: [
          { lens: requests!.columns[0], type: 'keyword' },
          { lens: requests!.columns[1], type: 'long' },
        ],
        rows: [
          ['checkout', 42],
          ['search', null],
        ],
      },
    });
  });

  it('lets several Lens IDs read one field and keeps multivalue cells', () => {
    const result = readResponse(latency, latencyResponse());
    expect(result.status === 'ready' && result.table.rows).toEqual([
      [120.5, 120.5, ['a', 'b']],
      [null, null, null],
    ]);
  });

  it('keeps an empty result', () => {
    const result = readResponse(requests, {
      ...requestsResponse(),
      values: [],
    });
    expect(result.status === 'ready' && result.table.rows).toEqual([]);
  });

  it('reads back a layer that went through JSON', () => {
    const stored: unknown = JSON.parse(JSON.stringify(requests));
    expect(readResponse(stored, requestsResponse()).status).toBe('ready');
  });

  it.each([
    [
      'a missing column',
      { columns: [{ name: 'requests', type: 'long' }], values: [[1]] },
      [
        {
          code: 'lens.response.missing-column',
          path: ['layer', 'columns', 0, 'fieldName'],
        },
      ],
    ],
    [
      'a duplicate column',
      {
        columns: [
          { name: 'requests', type: 'long' },
          { name: 'service.name', type: 'keyword' },
          { name: 'requests', type: 'long' },
        ],
        values: [],
      },
      [
        {
          code: 'lens.response.duplicate-column',
          path: ['response', 'columns', 2],
        },
      ],
    ],
    [
      'a ragged row',
      { ...requestsResponse(), values: [[1, 'a'], [2]] },
      [{ code: 'lens.response.row-width', path: ['response', 'values', 1] }],
    ],
    [
      'a partial response',
      { ...requestsResponse(), is_partial: true },
      [{ code: 'lens.response.incomplete', path: ['response', 'is_partial'] }],
    ],
    [
      'a running response',
      { ...requestsResponse(), is_running: true },
      [{ code: 'lens.response.incomplete', path: ['response', 'is_running'] }],
    ],
    [
      'no columns',
      { columns: [], values: [] },
      [{ code: 'lens.response.invalid-shape', path: ['response', 'columns'] }],
    ],
    [
      'a non-finite cell',
      { ...requestsResponse(), values: [[Infinity, 'a']] },
      [{ code: 'lens.response.invalid-json', path: ['response'] }],
    ],
  ])('refuses %s', (_name, response, diagnostics) => {
    expect(readResponse(requests, response)).toEqual({
      status: 'invalid',
      diagnostics: diagnostics.map(
        (diagnostic) => expect.objectContaining(diagnostic) as unknown
      ),
    });
  });

  it.each([
    ['an unknown key', { ...requests, extra: true }],
    [
      'duplicate Lens IDs',
      { ...requests, columns: [requests!.columns[0], requests!.columns[0]] },
    ],
    [
      'a form-based query',
      { ...requests, query: { language: 'kuery', esql: 'x' } },
    ],
  ])('refuses a layer with %s', (_name, layer) => {
    expect(readResponse(layer, requestsResponse())).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.response.invalid-layer' }],
    });
  });
});
