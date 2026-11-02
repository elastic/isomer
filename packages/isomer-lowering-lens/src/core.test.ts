/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { plan, readResponse } from './index';
import type { LensQueryPlan } from './schema';
import { isBoundedJson } from './schema';

const column = (columnId = 'id', fieldName = 'total') => ({
  columnId,
  fieldName,
});
const layer = () => ({
  query: { esql: '  ROW total = 42\n| KEEP total  ' },
  columns: [column()],
});
const input = () => ({
  savedObject: {
    id: 'lens-id',
    type: 'lens',
    attributes: {
      title: 'Recorded Lens',
      visualizationType: 'lnsXY',
      state: {
        datasourceStates: { textBased: { layers: { first: layer() } } },
        visualization: { arbitraryPresentation: ['preserved', 1] },
      },
    },
    references: [
      {
        id: 'view',
        type: 'index-pattern',
        name: 'indexpattern-datasource-layer-first',
      },
    ],
  },
});
const response = () => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[42], [null], [[1, 2]]],
});
const query = (): LensQueryPlan => ({
  layerId: 'first',
  query: { language: 'esql', esql: 'ROW total = 42' },
  context: { ignoreGlobalFilters: false },
  columns: [column()],
});

describe('plan', () => {
  it('preserves exact bytes, all layers, explicit context and opaque source without aliasing', () => {
    const source = input();
    const layers = {
      first: {
        ...layer(),
        timeField: '@timestamp',
        ignoreGlobalFilters: true,
        index: 'view',
        columns: [
          {
            ...column(),
            customLabel: true,
            label: 'Custom',
            meta: { type: 'number' },
            params: { format: { id: 'number' } },
          },
        ],
      },
      second: layer(),
    };
    const result = plan({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: {
            ...source.savedObject.attributes.state,
            datasourceStates: { textBased: { layers } },
          },
        },
      },
      dataViews: [
        {
          id: 'view',
          title: 'logs-*',
          timeFieldName: 'not-a-fallback',
          fieldFormats: { total: { id: 'number' } },
          fieldLabels: { total: 'Total' },
        },
      ],
    });
    expect(result.status).toBe('planned');
    if (result.status !== 'planned') {
      throw new Error('Expected plan');
    }
    expect(result.plan.version).toBe(1);
    expect(
      result.plan.queries.map(({ layerId, query, context }) => ({
        layerId,
        query,
        context,
      }))
    ).toEqual([
      {
        layerId: 'first',
        query: { language: 'esql', esql: '  ROW total = 42\n| KEEP total  ' },
        context: { ignoreGlobalFilters: true, timeFieldName: '@timestamp' },
      },
      {
        layerId: 'second',
        query: { language: 'esql', esql: '  ROW total = 42\n| KEEP total  ' },
        context: { ignoreGlobalFilters: false },
      },
    ]);
    expect(result.plan.queries[0]?.columns[0]).toEqual(layers.first.columns[0]);
    expect(result.plan.source.attributes.state.visualization).toEqual({
      arbitraryPresentation: ['preserved', 1],
    });
    expect(result.plan.dataViews[0]?.metadata).toEqual({
      id: 'view',
      title: 'logs-*',
      timeFieldName: 'not-a-fallback',
      fieldFormats: { total: { id: 'number' } },
      fieldLabels: { total: 'Total' },
    });
    layers.first.columns[0]!.label = 'Changed';
    expect(result.plan.queries[0]?.columns[0]?.label).toBe('Custom');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('does not invent unresolved metadata or require data views for source-free queries', () => {
    const result = plan(input());
    if (result.status !== 'planned') {
      throw new Error('Expected plan');
    }
    expect(result.plan.dataViews).toEqual([
      { reference: input().savedObject.references[0] },
    ]);
    expect(
      plan({ savedObject: { ...input().savedObject, references: [] } }).status
    ).toBe('planned');
  });

  it.each([
    { formBased: {} },
    { textBased: { layers: { first: layer() } }, formBased: {} },
    {},
    { legacy: {} },
  ])('explicitly refuses unsupported datasource %j', (datasourceStates) => {
    const source = input();
    const result = plan({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: { ...source.savedObject.attributes.state, datasourceStates },
        },
      },
    });
    expect(result).toMatchObject({
      status: 'unsupported',
      diagnostics: [{ code: 'lens.unsupported-datasource' }],
    });
    expect(result).not.toHaveProperty('plan');
  });

  it.each([
    { filters: [{ term: { service: 'checkout' } }] },
    { query: { language: 'kuery', query: 'service: checkout' } },
    { query: { language: 'esql', query: '' } },
    { query: { language: 'kuery' } },
  ])('does not silently drop saved execution context %j', (context) => {
    const source = input();
    const result = plan({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: { ...source.savedObject.attributes.state, ...context },
        },
      },
    });
    expect(result).toMatchObject({
      status: 'unsupported',
      diagnostics: [{ code: 'lens.unsupported-saved-context' }],
    });
    expect(result).not.toHaveProperty('plan');
  });

  it.each(['kuery', 'lucene'])('accepts empty %s saved context', (language) => {
    const source = input();
    expect(
      plan({
        savedObject: {
          ...source.savedObject,
          attributes: {
            ...source.savedObject.attributes,
            state: {
              ...source.savedObject.attributes.state,
              query: { language, query: '' },
              filters: [],
            },
          },
        },
      }).status
    ).toBe('planned');
  });

  it.each([
    { table: { columns: [], rows: [] }, columns: [column()] },
    { ...layer(), extension: true },
    { ...layer(), columns: [{ ...column(), params: { dropPartials: true } }] },
  ])(
    'refuses unsupported layer semantics without partial executable plans',
    (unsupported) => {
      const source = input();
      const result = plan({
        savedObject: {
          ...source.savedObject,
          attributes: {
            ...source.savedObject.attributes,
            state: {
              ...source.savedObject.attributes.state,
              datasourceStates: {
                textBased: { layers: { first: layer(), second: unsupported } },
              },
            },
          },
        },
      });
      expect(result).toMatchObject({
        status: 'unsupported',
        diagnostics: [{ code: 'lens.unsupported-layer-state' }],
      });
      expect(result).not.toHaveProperty('plan');
    }
  );

  it('refuses unknown native datasource extensions rather than ignoring them', () => {
    const source = input();
    const result = plan({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: {
            ...source.savedObject.attributes.state,
            datasourceStates: {
              textBased: { layers: { first: layer() }, extension: true },
            },
          },
        },
      },
    });
    expect(result).toMatchObject({
      status: 'unsupported',
      diagnostics: [{ code: 'lens.unsupported-datasource-state' }],
    });
    expect(result).not.toHaveProperty('plan');
  });

  it('keeps array indices numeric in schema diagnostic paths', () => {
    const result = plan({ ...input(), dataViews: [{ id: 'view', title: 9 }] });
    expect(result.diagnostics[0]?.path).toEqual(['dataViews', 0, 'title']);
    const responseResult = readResponse(query(), {
      ...response(),
      columns: [{ name: 'total', type: 9 }],
    });
    if (responseResult.status !== 'invalid') {
      throw new Error('Expected invalid response');
    }
    expect(responseResult.diagnostics[0]?.path).toEqual(['columns', 0, 'type']);
  });

  it.each([
    { query: { esql: '  \n' }, columns: [column()] },
    { columns: [column()] },
    { ...layer(), columns: [] },
    { ...layer(), columns: [column(), column()] },
    { ...layer(), query: { esql: 'ROW total = 1', language: 'esql' } },
  ])('refuses invalid native layer shapes %j', (invalid) => {
    const source = input();
    const result = plan({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: {
            ...source.savedObject.attributes.state,
            datasourceStates: { textBased: { layers: { first: invalid } } },
          },
        },
      },
    });
    expect(result.status).toBe('invalid');
    expect(result).not.toHaveProperty('plan');
    expect(result.diagnostics[0]?.path).toContain('first');
  });

  it.each([
    { dataViews: [{ id: 'other', title: 'Unreferenced' }] },
    {
      dataViews: [
        { id: 'view', title: 'A' },
        { id: 'view', title: 'B' },
      ],
    },
    {
      savedObject: {
        ...input().savedObject,
        references: [
          ...input().savedObject.references,
          ...input().savedObject.references,
        ],
      },
    },
  ])('rejects ambiguous references/metadata %j', (overrides) => {
    expect(plan({ ...input(), ...overrides }).status).toBe('invalid');
  });

  it.each([null, {}, { savedObject: {} }, { ...input(), surprise: true }])(
    'rejects malformed envelopes %j',
    (value) => {
      expect(plan(value).status).toBe('invalid');
    }
  );

  it('accepts 16 layers, refuses 17; accepts 512 columns, refuses 513', () => {
    const source = input();
    const withLayers = (count: number, columns = [column()]) => ({
      savedObject: {
        ...source.savedObject,
        attributes: {
          ...source.savedObject.attributes,
          state: {
            ...source.savedObject.attributes.state,
            datasourceStates: {
              textBased: {
                layers: Object.fromEntries(
                  Array.from({ length: count }, (_, i) => [
                    `layer-${i}`,
                    { ...layer(), columns },
                  ])
                ),
              },
            },
          },
        },
      },
    });
    expect(plan(withLayers(16)).status).toBe('planned');
    expect(plan(withLayers(17)).status).toBe('invalid');
    expect(
      plan(
        withLayers(
          1,
          Array.from({ length: 512 }, (_, i) => column(`id-${i}`))
        )
      ).status
    ).toBe('planned');
    expect(
      plan(
        withLayers(
          1,
          Array.from({ length: 513 }, (_, i) => column(`id-${i}`))
        )
      ).status
    ).toBe('invalid');
  });
});

describe('readResponse', () => {
  it('projects by field name in Lens order, preserving duplicate projections, nulls and multivalued values', () => {
    const planned = query();
    planned.columns = [
      column('a', 'total'),
      {
        ...column('b', 'service'),
        label: 'Friendly',
        params: { format: { id: 'string' } },
      },
      column('c', 'total'),
    ];
    const source = {
      columns: [
        { name: 'service', type: 'keyword' },
        { name: 'unused', type: 'boolean' },
        { name: 'total', type: 'long' },
      ],
      values: [
        ['checkout', true, null],
        [['search', 'checkout'], false, [1, 2]],
      ],
    };
    const result = readResponse(planned, source);
    expect(result).toEqual({
      status: 'ready',
      table: {
        layerId: 'first',
        columns: [
          { lens: column('a', 'total'), responseType: 'long' },
          { lens: planned.columns[1], responseType: 'keyword' },
          { lens: column('c', 'total'), responseType: 'long' },
        ],
        rows: [
          [null, 'checkout', null],
          [
            [1, 2],
            ['search', 'checkout'],
            [1, 2],
          ],
        ],
      },
    });
    source.values[1]![2] = [9];
    planned.columns[1]!.label = 'Mutated';
    expect(result.status === 'ready' && result.table.rows[1]?.[0]).toEqual([
      1, 2,
    ]);
    expect(
      result.status === 'ready' && result.table.columns[1]?.lens.label
    ).toBe('Friendly');
  });

  it('preserves empty result sets', () => {
    expect(readResponse(query(), { ...response(), values: [] })).toMatchObject({
      status: 'ready',
      table: { rows: [] },
    });
  });

  it.each([
    [{ ...response(), is_partial: true }, 'lens.response.incomplete'],
    [{ ...response(), is_running: true }, 'lens.response.incomplete'],
    [{ ...response(), values: [[1, 2]] }, 'lens.response.row-width'],
    [{ ...response(), values: [[]] }, 'lens.response.row-width'],
    [
      { ...response(), columns: [{ name: 'missing', type: 'long' }] },
      'lens.response.missing-column',
    ],
    [
      {
        ...response(),
        columns: [
          { name: 'total', type: 'long' },
          { name: 'total', type: 'long' },
        ],
        values: [[1, 2]],
      },
      'lens.response.duplicate-column',
    ],
    [{ ...response(), columns: [] }, 'lens.response.invalid-shape'],
    [{ ...response(), is_running: 'false' }, 'lens.response.invalid-shape'],
    [{ error: 'Backend failed' }, 'lens.response.invalid-shape'],
  ])('refuses bad responses without tables', (value, code) => {
    const result = readResponse(query(), value);
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') {
      throw new Error('Expected invalid response');
    }
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      code
    );
    expect(result).not.toHaveProperty('table');
  });

  it.each([
    null,
    {},
    { ...query(), columns: [column(), column()] },
    { ...query(), context: {} },
  ])('runtime-validates replayed queries %j', (value) => {
    expect(readResponse(value, response()).status).toBe('invalid');
  });

  it('enforces response row and column limits without truncation', () => {
    expect(
      readResponse(query(), {
        ...response(),
        values: Array.from({ length: 10_000 }, () => [1]),
      }).status
    ).toBe('ready');
    expect(
      readResponse(query(), {
        ...response(),
        values: Array.from({ length: 10_001 }, () => [1]),
      }).status
    ).toBe('invalid');
    const columns = Array.from({ length: 512 }, (_, i) => ({
      name: i === 0 ? 'total' : `extra-${i}`,
      type: 'long',
    }));
    expect(readResponse(query(), { columns, values: [] }).status).toBe('ready');
    expect(
      readResponse(query(), {
        columns: [...columns, { name: 'excess', type: 'long' }],
        values: [],
      }).status
    ).toBe('invalid');
  });
});

describe('bounded JSON', () => {
  it.each([
    undefined,
    NaN,
    Infinity,
    1n,
    () => 1,
    new Date(),
    new Map(),
    new Array(1),
    Object.assign([1], { extra: 2 }),
    JSON.parse('{"__proto__":{}}') as unknown,
    { constructor: 'no' },
    { prototype: 'no' },
    { [Symbol.for('test')]: 1 },
  ])('refuses non-JSON input without success-shaped outcomes', (value) => {
    expect(isBoundedJson(value)).toBe(false);
    expect(plan(value)).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.invalid-json' }],
    });
    expect(readResponse(query(), value).status).toBe('invalid');
  });

  it('refuses accessors without invoking them', () => {
    let called = false;
    const object = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        called = true;
        return 1;
      },
    });
    expect(plan(object).status).toBe('invalid');
    expect(called).toBe(false);
  });

  it('refuses cycles and excessive depth', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isBoundedJson(cyclic)).toBe(false);
    let nested: unknown = 1;
    for (let i = 0; i < 20; i++) {
      nested = [nested];
    }
    expect(isBoundedJson(nested)).toBe(true);
    expect(isBoundedJson([nested])).toBe(false);
  });

  it('enforces per-string, aggregate-character, entry and aggregate-value limits independently', () => {
    expect(isBoundedJson('x'.repeat(100_000))).toBe(true);
    expect(isBoundedJson('x'.repeat(100_001))).toBe(false);
    expect(
      isBoundedJson(Array.from({ length: 19 }, () => 'x'.repeat(100_000)))
    ).toBe(true);
    expect(
      isBoundedJson(Array.from({ length: 21 }, () => 'x'.repeat(100_000)))
    ).toBe(false);
    expect(isBoundedJson(Array.from({ length: 10_000 }, () => null))).toBe(
      true
    );
    expect(isBoundedJson(Array.from({ length: 10_001 }, () => null))).toBe(
      false
    );
    expect(
      isBoundedJson(
        Array.from({ length: 10 }, () =>
          Array.from({ length: 9998 }, () => null)
        )
      )
    ).toBe(true);
    expect(
      isBoundedJson(
        Array.from({ length: 10 }, () =>
          Array.from({ length: 10_000 }, () => null)
        )
      )
    ).toBe(false);
  });
});
