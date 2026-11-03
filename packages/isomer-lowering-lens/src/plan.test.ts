/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { singleLayerInput, twoLayerInput } from './native_esql.fixtures';
import { plan } from './plan';
import type { LensPlanResult } from './schema';
import { layerPlanSchema } from './schema';

const LAYERS = [
  'savedObject',
  'attributes',
  'state',
  'datasourceStates',
  'textBased',
  'layers',
];

const planned = (result: LensPlanResult) => {
  if (result.status !== 'planned') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.plan;
};

/** `singleLayerInput` with `edit` applied to its only layer. */
const withLayer = (edit: (layer: Record<string, unknown>) => void) => {
  const input = singleLayerInput();
  const layers = input.savedObject.attributes.state.datasourceStates.textBased
    .layers as Record<string, Record<string, unknown>>;
  edit(layers.layer1!);
  delete (input.savedObject.attributes.state as { query?: unknown }).query;
  return input;
};

describe('plan', () => {
  it('plans the shape Kibana saves, mirrored global query included', () => {
    const input = singleLayerInput();
    const { version, layers, filters, dataViews } = planned(plan(input));
    expect(version).toBe(1);
    expect(filters).toEqual([]);
    expect(dataViews).toEqual([
      {
        reference: {
          id: 'logs-view',
          type: 'index-pattern',
          name: 'textBased-layer1',
        },
        metadata: {
          id: 'logs-view',
          title: 'logs-*',
          timeFieldName: '@timestamp',
        },
      },
    ]);
    expect(layers).toEqual([
      {
        kind: 'esql',
        layerId: 'layer1',
        query: {
          language: 'esql',
          esql: 'FROM logs-*\n| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend\n| STATS requests = COUNT(*) BY service.name',
        },
        columns:
          input.savedObject.attributes.state.datasourceStates.textBased.layers
            .layer1.columns,
        host: {
          timeField: '@timestamp',
          params: ['_tstart', '_tend'],
          applyFilters: true,
        },
      },
    ]);
  });

  it('keeps every layer, saved filters, and several Lens IDs reading one field', () => {
    const { layers, filters } = planned(plan(twoLayerInput()));
    expect(layers.map(({ layerId }) => layerId)).toEqual(['layer1', 'layer2']);
    expect(filters).toEqual([
      {
        meta: { key: 'env', negate: false },
        query: { match_phrase: { env: 'production' } },
      },
    ]);
    expect(layers[1]?.host).toEqual({
      timeField: null,
      params: [],
      applyFilters: false,
    });
    expect(layers[1]?.columns.map(({ fieldName }) => fieldName)).toEqual([
      'p95',
      'p95',
      'hosts',
    ]);
  });

  it('returns plain JSON that shares nothing with the input', () => {
    const input = twoLayerInput();
    const result = planned(plan(input));
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.source).toEqual(input.savedObject);
    expect(result.source).not.toBe(input.savedObject);
    expect(result.layers[0]?.columns[0]).not.toBe(
      input.savedObject.attributes.state.datasourceStates.textBased.layers
        .layer1.columns[0]
    );
  });

  it('plans a parameter name at the identifier limit into a layer readResponse accepts', () => {
    const name = 'p'.repeat(4096);
    const [layer] = planned(
      plan(
        withLayer((entry) =>
          Object.assign(entry, {
            query: { esql: `FROM logs | WHERE x == ?${name}` },
          })
        )
      )
    ).layers;
    expect(layer?.host.params).toEqual([name]);
    expect(layerPlanSchema.safeParse(layer).success).toBe(true);
  });

  it.each([
    [
      'omitted',
      ({ savedObject }: ReturnType<typeof singleLayerInput>) => ({
        savedObject,
      }),
    ],
    [
      'undefined',
      ({ savedObject }: ReturnType<typeof singleLayerInput>) => ({
        savedObject,
        dataViews: undefined,
      }),
    ],
  ])('plans with data view metadata %s and invents none', (_name, input) => {
    expect(planned(plan(input(singleLayerInput()))).dataViews).toEqual([
      {
        reference: {
          id: 'logs-view',
          type: 'index-pattern',
          name: 'textBased-layer1',
        },
      },
    ]);
  });

  it("accepts the first layer's query mirrored as the global query of several layers", () => {
    const input = twoLayerInput();
    const { layers } =
      input.savedObject.attributes.state.datasourceStates.textBased;
    Object.assign(input.savedObject.attributes.state, {
      query: { esql: layers.layer1.query.esql },
    });
    expect(planned(plan(input)).layers).toHaveLength(2);
  });

  it("refuses a layer whose planned form exceeds the reader's input budget", () => {
    const params = Array.from({ length: 6000 }, (_, index) => `?p${index}`);
    const result = plan(
      withLayer((layer) => {
        Object.assign(layer, {
          query: { esql: `FROM logs | WHERE x IN (${params.join(', ')})` },
        });
        (layer.columns as { meta?: unknown }[])[0]!.meta = {
          values: new Array<number>(195_000).fill(1),
        };
      })
    );
    expect(result).toEqual({
      status: 'invalid',
      diagnostics: [
        expect.objectContaining({
          code: 'lens.layer-too-large',
          path: [...LAYERS, 'layer1'],
        }),
      ],
    });
  });

  it.each([
    ['empty KQL', { query: '', language: 'kuery' }],
    ['empty Lucene', { query: '', language: 'lucene' }],
  ])('accepts %s as the global query', (_name, query) => {
    const input = singleLayerInput();
    Object.assign(input.savedObject.attributes.state, { query });
    expect(plan(input).status).toBe('planned');
  });

  it.each([
    ['nonempty KQL', { query: 'env:prod', language: 'kuery' }],
    ['different ES|QL', { esql: 'FROM other' }],
    ['ES|QL with another key', { esql: 'FROM logs-*', language: 'esql' }],
  ])('refuses %s as the global query', (_name, query) => {
    const input = singleLayerInput();
    Object.assign(input.savedObject.attributes.state, { query });
    expect(plan(input)).toEqual({
      status: 'unsupported',
      diagnostics: [
        expect.objectContaining({
          code: 'lens.unsupported-global-query',
          path: ['savedObject', 'attributes', 'state', 'query'],
        }),
      ],
    });
  });

  it.each([
    [
      'a form-based datasource',
      { formBased: { layers: {} } },
      'lens.unsupported-datasource',
      ['savedObject', 'attributes', 'state', 'datasourceStates'],
    ],
    [
      'mixed datasources',
      { formBased: {}, textBased: { layers: {} } },
      'lens.unsupported-datasource',
      ['savedObject', 'attributes', 'state', 'datasourceStates'],
    ],
    [
      'an ES|QL datasource with no layers',
      { textBased: { layers: {} } },
      'lens.no-layers',
      LAYERS.slice(0, -1),
    ],
  ])('refuses %s', (_name, datasourceStates, code, path) => {
    const input = singleLayerInput();
    Object.assign(input.savedObject.attributes.state, { datasourceStates });
    const result = plan(input);
    expect(result.status).not.toBe('planned');
    expect(result.status !== 'planned' && result.diagnostics).toEqual([
      expect.objectContaining({ code, path }),
    ]);
  });

  it('ignores the runtime and empty datasource states Kibana saves', () => {
    const input = singleLayerInput();
    const { datasourceStates } = input.savedObject.attributes.state;
    Object.assign(datasourceStates.textBased, {
      indexPatternRefs: [{ id: 'logs-view', title: 'logs-*' }],
    });
    Object.assign(datasourceStates, {
      formBased: { layers: {} },
      indexpattern: { layers: {} },
    });
    expect(planned(plan(input)).layers).toHaveLength(1);
  });

  it('refuses unknown datasource state beside real layers', () => {
    const input = singleLayerInput();
    Object.assign(
      input.savedObject.attributes.state.datasourceStates.textBased,
      { initialContext: {} }
    );
    expect(plan(input)).toMatchObject({
      status: 'unsupported',
      diagnostics: [{ code: 'lens.unsupported-datasource-state' }],
    });
  });

  it.each([
    [
      'unknown state',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, { surprise: true }),
      'unsupported',
      'lens.unsupported-layer-state',
      [...LAYERS, 'layer1'],
    ],
    [
      'an inline table',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, { table: { type: 'datatable' } }),
      'unsupported',
      'lens.unsupported-inline-table',
      [...LAYERS, 'layer1', 'table'],
    ],
    [
      'saved editor errors',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, { errors: [{ message: 'Unknown column' }] }),
      'invalid',
      'lens.layer-errors',
      [...LAYERS, 'layer1', 'errors'],
    ],
    [
      'an ES|QL syntax error',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, { query: { esql: 'FROM logs | WHERE' } }),
      'invalid',
      'lens.invalid-esql-query',
      [...LAYERS, 'layer1', 'query', 'esql'],
    ],
    [
      'a positional parameter',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, {
          query: { esql: 'FROM logs | WHERE x == ?1' },
        }),
      'unsupported',
      'lens.unsupported-positional-param',
      [...LAYERS, 'layer1', 'query', 'esql'],
    ],
    [
      'no query',
      (layer: Record<string, unknown>) => delete layer.query,
      'invalid',
      'lens.missing-esql-query',
      [...LAYERS, 'layer1'],
    ],
    [
      'a duplicate column ID',
      (layer: Record<string, unknown>) =>
        (layer.columns as unknown[]).push({
          columnId: 'service',
          fieldName: 'x',
        }),
      'invalid',
      'lens.duplicate-column',
      [...LAYERS, 'layer1', 'columns', 2],
    ],
    [
      'dropped partial buckets',
      (layer: Record<string, unknown>) =>
        Object.assign((layer.columns as Record<string, unknown>[])[1]!, {
          params: { dropPartials: true },
        }),
      'unsupported',
      'lens.unsupported-drop-partials',
      [...LAYERS, 'layer1', 'columns', 1, 'params', 'dropPartials'],
    ],
    [
      'an anonymous parameter',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, { query: { esql: 'FROM logs | WHERE x == ?' } }),
      'unsupported',
      'lens.unsupported-anonymous-param',
      [...LAYERS, 'layer1', 'query', 'esql'],
    ],
    [
      'a parameter name past the identifier limit',
      (layer: Record<string, unknown>) =>
        Object.assign(layer, {
          query: { esql: `FROM logs | WHERE x == ?${'p'.repeat(4097)}` },
        }),
      'unsupported',
      'lens.unsupported-param-name',
      [...LAYERS, 'layer1', 'query', 'esql'],
    ],
  ])('refuses a layer with %s', (_name, edit, status, code, path) => {
    const result = plan(withLayer(edit));
    expect(result.status).toBe(status);
    expect(result.status !== 'planned' && result.diagnostics).toEqual([
      expect.objectContaining({ code, path }),
    ]);
  });

  it('plans a layer that saved an empty errors list', () => {
    expect(
      plan(withLayer((layer) => Object.assign(layer, { errors: [] }))).status
    ).toBe('planned');
  });

  it('reports schema problems at numeric array paths', () => {
    const result = plan(
      withLayer(
        (layer) => ((layer.columns as unknown[])[1] = { columnId: 'x' })
      )
    );
    expect(result).toEqual({
      status: 'invalid',
      diagnostics: [
        expect.objectContaining({
          code: 'lens.invalid-esql-layer',
          path: [...LAYERS, 'layer1', 'columns', 1, 'fieldName'],
        }),
      ],
    });
  });

  it('reports every duplicate reference and unreferenced or repeated data view', () => {
    const input = singleLayerInput();
    const [reference] = input.savedObject.references;
    input.savedObject.references.push({ ...reference!, id: 'other' });
    input.dataViews.push(input.dataViews[0]!, {
      id: 'stray',
      title: 'stray',
      timeFieldName: '@timestamp',
    });
    const result = plan(input);
    expect(result.status !== 'planned' && result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'lens.duplicate-reference',
        path: ['savedObject', 'references', 1],
      }),
      expect.objectContaining({
        code: 'lens.duplicate-data-view',
        path: ['dataViews', 1],
      }),
      expect.objectContaining({
        code: 'lens.unreferenced-data-view',
        path: ['dataViews', 2],
      }),
    ]);
  });

  it.each([
    [null, 'lens.invalid-input'],
    [{}, 'lens.invalid-input'],
    [{ ...singleLayerInput(), surprise: true }, 'lens.invalid-input'],
    [
      Object.defineProperty({}, 'savedObject', {
        get: () => singleLayerInput().savedObject,
        enumerable: true,
      }),
      'lens.invalid-json',
    ],
  ])('refuses malformed input %#', (input, code) => {
    expect(plan(input)).toMatchObject({
      status: 'invalid',
      diagnostics: [expect.objectContaining({ code })],
    });
  });

  it('refuses a non-JSON value at the object holding it', () => {
    const input = singleLayerInput();
    Object.assign(input.savedObject.attributes.state, {
      filters: [{ meta: { value: Number.NaN } }],
    });
    expect(plan(input)).toMatchObject({
      status: 'invalid',
      diagnostics: [
        expect.objectContaining({
          code: 'lens.invalid-input',
          path: [...LAYERS.slice(0, 3), 'filters', 0, 'meta'],
        }),
      ],
    });
  });
});
