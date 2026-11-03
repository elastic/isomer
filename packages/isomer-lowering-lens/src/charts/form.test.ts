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

  it("raises a term's filter, and negates the shown terms for Other", () => {
    expect(
      node(run(breakdown(), twoCarriers, 'filter')).tiles.map(
        ({ action }) => action?.filters
      )
    ).toEqual([
      [{ field: 'Carrier', value: 'Logstash Airways' }],
      [{ field: 'Carrier', values: ['Logstash Airways'], negate: true }],
    ]);
  });

  it('raises a missing bucket as a negated existence filter', () => {
    const missing = carriers([{ carrier: '__missing__', count: 4, max: 1000 }]);
    expect(
      node(run(breakdown(), missing, 'filter')).tiles[0]!.action?.filters
    ).toEqual([{ field: 'Carrier', exists: false }]);
  });

  /** The breakdown with its terms column swapped for another bucket column. */
  const bucketed = (column: Record<string, unknown>) => {
    const input = breakdown();
    const layer = (
      input.savedObject.attributes.state.datasourceStates.formBased
        .layers as Record<string, { columns: Record<string, unknown> }>
    ).layer!;
    layer.columns.carrier = column;
    return input;
  };
  const cells = (carrier: unknown, type = 'string') => ({
    layer: {
      columns: [
        { id: 'carrier', name: 'Bucket', meta: { type } },
        number('count', 'Flights'),
        number('max', 'Static value: 1000'),
      ],
      rows: [{ carrier, count: 4, max: 1000 }],
    },
  });

  it("raises a filters bucket's own query", () => {
    const filters = bucketed({
      operationType: 'filters',
      label: 'Filters',
      dataType: 'string',
      isBucketed: true,
      params: {
        filters: [
          {
            input: { query: 'Carrier : "Kibana Airlines"', language: 'kuery' },
            label: 'Kibana',
          },
          {
            input: { query: 'Cancelled : true', language: 'kuery' },
            label: '',
          },
        ],
      },
    });
    expect(
      node(run(filters, cells('Kibana'), 'filter')).tiles[0]!.action?.filters
    ).toEqual([{ query: 'Carrier : "Kibana Airlines"', language: 'kuery' }]);
    expect(
      node(run(filters, cells('Cancelled : true'), 'filter')).tiles[0]!.action
        ?.filters
    ).toEqual([{ query: 'Cancelled : true', language: 'kuery' }]);
  });

  it("raises a range bucket's range and titles it as Lens's range format does", () => {
    const range = bucketed({
      operationType: 'range',
      label: 'Distance',
      dataType: 'number',
      isBucketed: true,
      sourceField: 'DistanceKilometers',
      params: {
        type: 'range',
        maxBars: 'auto',
        ranges: [{ from: 1000, to: null, label: '' }],
        parentFormat: {
          id: 'range',
          params: { template: 'arrow_right', replaceInfinity: true },
        },
      },
    });
    // An open bound, Infinity in Kibana, arrives as `null` in JSON.
    const { tiles } = node(
      run(range, cells({ gte: 1000, lt: null }, 'number'), 'filter')
    );
    expect(tiles[0]).toMatchObject({
      title: '1,000 \u2192 +\u221E',
      action: {
        filters: [{ field: 'DistanceKilometers', range: { gte: 1000 } }],
      },
    });
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

describe('bind: data view formats', () => {
  const id = '81124c45-6ab6-42f4-8859-495d55eb8065';
  const withFormat = (params: Record<string, unknown>) =>
    run(totalFlights(), {
      '8fa993db-c147-4954-adf7-4ff264d42576': {
        columns: [
          { id, name: 'Total flights', meta: { type: 'number', params } },
        ],
        rows: [{ [id]: 1500 }],
      },
    });

  it('reads a duration precisely, as the metric defaults a data view duration', () => {
    expect(
      node(
        withFormat({ id: 'duration', params: { inputFormat: 'milliseconds' } })
      ).tiles[0]!.format
    ).toEqual({
      kind: 'duration',
      from: 'milliseconds',
      to: 'humanizePrecise',
      decimals: 1,
      short: true,
      showSuffix: false,
      spaceBeforeSuffix: true,
    });
  });

  it("takes a bytes field's pattern, or Kibana's default bytes pattern", () => {
    expect(
      node(withFormat({ id: 'bytes', params: { pattern: '0.0b' } })).tiles[0]!
        .format
    ).toEqual({
      kind: 'pattern',
      pattern: '0.0b',
    });
    expect(node(withFormat({ id: 'bytes' })).tiles[0]!.format).toEqual({
      kind: 'pattern',
      pattern: '0,0.[0]b',
    });
  });

  it('refuses a data view format it cannot read', () => {
    const result = withFormat({ id: 'color' });
    expect(
      result.status === 'bound'
        ? []
        : result.diagnostics.map(({ code }) => code)
    ).toEqual(['lens.metric.unsupported-format']);
  });
});

describe('bind: form-based trends', () => {
  // Lens adds a metric's trendline as a layer linked to the main one.
  const trended = () => ({
    savedObject: {
      id: 'flights-trend',
      type: 'lens',
      references: [
        {
          type: 'index-pattern',
          id: 'flights',
          name: 'indexpattern-datasource-layer-main',
        },
        {
          type: 'index-pattern',
          id: 'flights',
          name: 'indexpattern-datasource-layer-trend',
        },
      ],
      attributes: {
        title: 'Flights',
        visualizationType: 'lnsMetric',
        state: {
          query: { query: '', language: 'kuery' },
          filters: [],
          datasourceStates: {
            formBased: {
              layers: {
                main: {
                  columnOrder: ['count'],
                  columns: {
                    count: {
                      operationType: 'count',
                      label: 'Flights',
                      customLabel: true,
                      dataType: 'number',
                      isBucketed: false,
                      sourceField: '___records___',
                    },
                  },
                },
                trend: {
                  linkToLayers: ['main'],
                  columnOrder: ['time', 'trendCount'],
                  columns: {
                    time: {
                      operationType: 'date_histogram',
                      label: 'timestamp',
                      dataType: 'date',
                      isBucketed: true,
                      sourceField: 'timestamp',
                      params: { interval: 'auto', includeEmptyRows: true },
                    },
                    trendCount: {
                      operationType: 'count',
                      label: 'Flights',
                      dataType: 'number',
                      isBucketed: false,
                      sourceField: '___records___',
                    },
                  },
                },
              },
            },
          },
          visualization: {
            layerId: 'main',
            layerType: 'data',
            metricAccessor: 'count',
            trendlineLayerId: 'trend',
            trendlineLayerType: 'metricTrendline',
            trendlineTimeAccessor: 'time',
            trendlineMetricAccessor: 'trendCount',
          },
        },
      },
    },
  });

  it('plans the linked trendline layer and draws its sparkline', () => {
    const lensPlan = planned(trended());
    expect(
      lensPlan.layers.map((layer) => [
        layer.layerId,
        layer.kind === 'form' ? layer.linkedTo : [],
      ])
    ).toEqual([
      ['main', []],
      ['trend', ['main']],
    ]);
    const { tiles } = node(
      run(trended(), {
        main: { columns: [number('count', 'Flights')], rows: [{ count: 30 }] },
        trend: {
          columns: [
            { id: 'time', name: 'timestamp', meta: { type: 'date' } },
            number('trendCount', 'Flights'),
          ],
          rows: [
            { time: 2000, trendCount: 20 },
            { time: 1000, trendCount: 10 },
          ],
        },
      })
    );
    expect(tiles[0]!.visual).toEqual({
      kind: 'trend',
      points: [
        { x: 1000, y: 10 },
        { x: 2000, y: 20 },
      ],
    });
  });

  it('refuses a link to a layer the datasource lacks', () => {
    const input = trended();
    (
      input.savedObject.attributes.state.datasourceStates.formBased.layers
        .trend as { linkToLayers: string[] }
    ).linkToLayers = ['gone'];
    const result = plan(input);
    expect(
      result.status === 'planned'
        ? []
        : result.diagnostics.map(({ code }) => code)
    ).toEqual(['lens.form.unknown-linked-layer']);
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

  it('reads a cell a row lacks as null, even for a column named like an inherited property', () => {
    const inherited = {
      ...layer,
      columns: [{ ...layer.columns[0]!, columnId: 'toString' }],
    };
    expect(
      readTable(inherited, {
        type: 'datatable',
        columns: [number('toString', 'Total flights')],
        rows: [{}],
      })
    ).toMatchObject({ status: 'ready', table: { rows: [[null]] } });
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
