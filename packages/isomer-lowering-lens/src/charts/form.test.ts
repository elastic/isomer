/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { delayed, totalFlights } from '../form/flights.fixtures';
import { plan } from '../plan';
import { readTable } from '../read_table';
import type { LensPlan } from '../schema';

import { bind } from './index';

// Expected nodes follow Lens's `metricVis` over the Datatable Lens's
// expression hands it: one column per Lens column ID, named by its label.

type Row = Record<string, unknown>;
type Column = { id: string; name: string; meta: Record<string, unknown> };

const planned = (input: unknown): LensPlan => {
  const result = plan(input);
  if (result.status !== 'planned') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.plan;
};

const run = (
  input: unknown,
  tables: Record<string, { columns: Column[]; rows: Row[] }>,
  filterAction?: string
) => {
  const lensPlan = planned(input);
  const read = lensPlan.layers.map((layer) => {
    const result = readTable(layer, {
      type: 'datatable',
      ...tables[layer.layerId]!,
    });
    if (result.status !== 'ready') {
      throw new Error(JSON.stringify(result.diagnostics));
    }
    return result.table;
  });
  return bind(lensPlan, read, filterAction ? { filterAction } : {});
};

const node = (result: ReturnType<typeof bind>) => {
  if (result.status !== 'bound') {
    throw new Error(JSON.stringify(result.diagnostics));
  }
  return result.node;
};

const number = (id: string, name: string) => ({
  id,
  name,
  meta: { type: 'number' },
});

describe('bind: form-based Lens', () => {
  it('binds the "Total flights" sample count', () => {
    const id = '81124c45-6ab6-42f4-8859-495d55eb8065';
    expect(
      node(
        run(totalFlights(), {
          '8fa993db-c147-4954-adf7-4ff264d42576': {
            columns: [number(id, 'Total flights')],
            rows: [{ [id]: 13_059 }],
          },
        })
      )
    ).toEqual({
      type: 'metric',
      tiles: [{ key: 'metric', title: 'Total flights', value: 13_059 }],
      layout: { density: 'compact' },
    });
  });

  it('binds the "Delayed" sample formula with its percent format', () => {
    const id = '7e8fe9b1-f45c-4f3d-9561-30febcd357ec';
    expect(
      node(
        run(delayed(), {
          'b4712d43-1e84-4f5b-878d-8e38ba748317': {
            columns: [number(id, 'Delayed')],
            rows: [{ [id]: 0.2512 }],
          },
        })
      ).tiles
    ).toEqual([
      {
        key: 'metric',
        title: 'Delayed',
        value: 0.2512,
        format: { kind: 'percent', decimals: 1, compact: true },
      },
    ]);
  });
});

/** A form-based metric with a Top 3 breakdown, Other bucket and static max. */
const breakdown = (collapseFn?: string) => ({
  savedObject: {
    id: 'carriers',
    type: 'lens',
    references: [
      {
        type: 'index-pattern',
        id: 'flights',
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
                    label: 'Static value: 1000',
                    dataType: 'number',
                    isBucketed: false,
                    references: [],
                    params: { value: '1000' },
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
          ...(collapseFn ? { collapseFn } : {}),
        },
      },
    },
  },
});

const carriers = (rows: Row[]) => ({
  layer: {
    columns: [
      {
        id: 'carrier',
        name: 'Top 3 values of Carrier',
        meta: {
          type: 'string',
          params: {
            id: 'terms',
            params: { id: 'string', otherBucketLabel: 'Other' },
          },
        },
      },
      number('count', 'Flights'),
      number('max', 'Static value: 1000'),
    ],
    rows,
  },
});

describe('bind: form-based breakdowns', () => {
  const twoCarriers = carriers([
    { carrier: 'Logstash Airways', count: 400, max: 1000 },
    { carrier: '__other__', count: 300, max: 1000 },
  ]);

  it('labels the Other bucket and pads to the most terms it can return', () => {
    const result = node(run(breakdown(), twoCarriers));
    expect(result.placeholders).toBe(2);
    expect(
      result.tiles.map(({ title, subtitle }) => [title, subtitle])
    ).toEqual([
      ['Logstash Airways', 'Flights'],
      ['Other', 'Flights'],
    ]);
  });

  it('raises a term filter, and refuses one for the Other bucket', () => {
    const one = carriers([
      { carrier: 'Logstash Airways', count: 400, max: 1000 },
    ]);
    expect(node(run(breakdown(), one, 'filter')).tiles[0]!.action).toEqual({
      name: 'filter',
      filters: [{ field: 'Carrier', value: 'Logstash Airways' }],
    });
    const result = run(breakdown(), twoCarriers, 'filter');
    expect(
      result.status === 'bound'
        ? []
        : result.diagnostics.map(({ code }) => code)
    ).toEqual(['lens.metric.unsupported-filter-value']);
  });

  it('collapses a static max with `max`, keeping the value its author set', () => {
    const result = node(
      run(
        breakdown('sum'),
        carriers([
          { carrier: 'Logstash Airways', count: 400, max: 1000 },
          { carrier: 'Kibana Airlines', count: 300, max: 1000 },
        ])
      )
    );
    expect(result.tiles).toEqual([
      {
        key: 'metric',
        title: 'Flights',
        value: 700,
        visual: { kind: 'progress', max: 1000 },
      },
    ]);
    expect(result.placeholders).toBeUndefined();
  });
});

describe('readTable', () => {
  const layer = planned(totalFlights()).layers[0]!;

  it('refuses a table missing a planned column', () => {
    expect(
      readTable(layer, { type: 'datatable', columns: [], rows: [] })
    ).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.table.missing-column' }],
    });
  });

  it('refuses a table with a repeated column', () => {
    const column = number(
      '81124c45-6ab6-42f4-8859-495d55eb8065',
      'Total flights'
    );
    expect(
      readTable(layer, {
        type: 'datatable',
        columns: [column, column],
        rows: [],
      })
    ).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.table.duplicate-column' }],
    });
  });

  it('refuses an ES|QL layer', () => {
    expect(
      readTable(
        { ...layer, kind: 'esql' },
        { type: 'datatable', columns: [], rows: [] }
      )
    ).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.table.invalid-layer' }],
    });
  });
});
