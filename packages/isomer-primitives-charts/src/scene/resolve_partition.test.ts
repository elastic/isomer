/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from Lens's partition visualization: slices largest
// first except a mosaic's columns, palette colors by where a category first
// shows, inner layers lightened toward the background by a fifth per layer
// (chroma-js's LCH mix), a mosaic's outer layer transparent, Lens's empty texts,
// and EUI Borealis's `euiColorVis*`.

import { describe, expect, it } from 'vitest';

import { partitionChartExamples } from '../schema/examples/partition_chart';
import type { PartitionChartNode } from '../schema/partition_chart';

import { resolveChart } from './resolve';
import type { PartitionNode, PartitionScene } from './types';

const VIS = [
  '#16C5C0',
  '#A6EDEA',
  '#61A2FF',
  '#BFDBFF',
  '#EE72A6',
  '#FFC7DB',
] as const;

const named = (name: string): PartitionChartNode =>
  partitionChartExamples.find((example) => example.name === name)!.node;

const resolve = (
  node: PartitionChartNode,
  scheme: 'light' | 'dark' = 'light'
): PartitionScene => resolveChart(node, { scheme });

const flat = (nodes: readonly PartitionNode[]): PartitionNode[] =>
  nodes.flatMap((node) => [node, ...flat(node.children)]);

const string = (id: string) =>
  ({ id, label: id, type: 'string', role: 'dimension' }) as const;
const number = (id: string) =>
  ({ id, label: id, type: 'number', role: 'metric' }) as const;

const chart = (
  overrides: Partial<PartitionChartNode> = {}
): PartitionChartNode => ({
  type: 'partitionChart',
  shape: 'pie',
  data: {
    columns: [string('g'), number('v')],
    rows: [
      ['a', 1],
      ['b', 3],
      ['c', 3],
      ['d', 2],
    ],
  },
  metrics: [{ column: 'v' }],
  groups: [{ column: 'g' }],
  ...overrides,
});

describe('resolvePartition', () => {
  it('orders slices largest first, ties in row order', () => {
    expect(resolve(chart()).nodes.map(({ label }) => label)).toEqual([
      'b',
      'c',
      'd',
      'a',
    ]);
  });

  it('colors by where each category first shows, not by size', () => {
    expect(
      resolve(chart()).nodes.map(({ label, color }) => [label, color])
    ).toEqual([
      ['b', VIS[1]],
      ['c', VIS[2]],
      ['d', VIS[3]],
      ['a', VIS[0]],
    ]);
  });

  it('takes stated colors by key part, including the missing bucket', () => {
    const scene = resolve(
      named('Donut with Other and missing buckets'),
      'dark'
    );
    const color = (label: string) =>
      scene.nodes.find((node) => node.label === label)?.color;
    expect(color('Other')).toBe('#485975');
    expect(color('(null)')).toBe('#5A6D8C');
    expect(color('US')).toBe('#16C5C0');
  });

  it('colors a category named like an inherited member from the palette', () => {
    const scene = resolve(
      chart({
        data: {
          columns: [string('g'), number('v')],
          rows: [
            ['constructor', 3],
            ['toString', 2],
            ['__proto__', 1],
          ],
        },
        colors: { byKey: { toString: { light: '#000000', dark: '#000000' } } },
      })
    );
    expect(scene.nodes.map(({ label, color }) => [label, color])).toEqual([
      ['constructor', VIS[0]],
      ['toString', '#000000'],
      ['__proto__', VIS[2]],
    ]);
  });

  it('keeps a translucent stated color translucent on every layer', () => {
    const scene = resolve(
      chart({
        groups: [{ column: 'g' }, { column: 'h' }],
        data: {
          columns: [string('g'), string('h'), number('v')],
          rows: [['a', 'x', 1]],
        },
        colors: { byKey: { a: { light: '#16C5C080', dark: '#16C5C080' } } },
      })
    );
    const [outer] = scene.nodes;
    expect(outer!.color).toBe('#16C5C080');
    expect(outer!.children[0]!.color).toBe('#65D1CC99');
  });

  it('keeps sums past the largest number finite, with their shares', () => {
    const scene = resolve(
      chart({
        data: {
          columns: [string('g'), number('v')],
          rows: [
            ['a', Number.MAX_VALUE],
            ['a', Number.MAX_VALUE],
            ['b', Number.MAX_VALUE],
            ['b', Number.MAX_VALUE],
            ['c', Number.MAX_VALUE],
          ],
        },
      })
    );
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
    expect(scene.total).toBe(Number.MAX_VALUE);
    expect(
      scene.nodes.map(({ label, value, share }) => [label, value, share])
    ).toEqual([
      ['a', Number.MAX_VALUE, 0.4],
      ['b', Number.MAX_VALUE, 0.4],
      ['c', Number.MAX_VALUE, 0.2],
    ]);
  });

  it('orders thousands of metrics in metric order', () => {
    const count = 5_000;
    const ids = Array.from({ length: count }, (_, index) => `m${index}`);
    const scene = resolve(
      chart({
        metrics: ids.map((column) => ({ column })),
        groups: [],
        data: {
          columns: ids.map(number),
          rows: [ids.map((_, index) => index + 1)],
        },
      })
    );
    expect(scene.nodes.map(({ metric }) => metric)).toEqual(ids);
    expect(scene.legend.items.map(({ key }) => key)).toEqual(
      scene.nodes.map(({ key }) => key)
    );
  });

  it('resolves a slice of every row at the input budget', () => {
    const rows = Array.from({ length: 125_000 }, (_, row) => ['a', row % 2]);
    const scene = resolve(
      chart({ data: { columns: [string('g'), number('v')], rows } })
    );
    expect(scene.nodes).toHaveLength(1);
    expect(scene.nodes[0]!.source.rows).toHaveLength(125_000);
    expect(scene.nodes[0]!.value).toBe(62_500);
  });

  it('lightens inner layers toward the background, by scheme', () => {
    const node = named('Nested pie with values');
    const light = resolve(node);
    expect(light.nodes[0]!.color).toBe(VIS[0]);
    // chroma.mix('#16C5C0', '#FFFFFF', 0.2, 'lch')
    expect(light.nodes[0]!.children.map(({ color }) => color)).toEqual([
      '#65D1CC',
      '#65D1CC',
    ]);
    const dark = resolve(node, 'dark');
    // chroma.mix('#61A2FF', '#111C2C', 0.2, 'lch')
    expect(dark.nodes[2]!.color).toBe(VIS[2]);
    expect(dark.nodes[2]!.children[0]!.color).toBe('#4E85D0');
  });

  it('leaves a mosaic’s columns in row order and transparent, coloring the inner layer by its own category', () => {
    const scene = resolve(named('Mosaic'));
    expect(scene.nodes.map(({ label, color }) => [label, color])).toEqual([
      ['Windows', '#FFFFFF00'],
      ['macOS', '#FFFFFF00'],
      ['Linux', '#FFFFFF00'],
    ]);
    expect(
      scene.nodes[1]!.children.map(({ label, color }) => [label, color])
    ).toEqual([
      ['Safari', VIS[3]],
      ['Chrome', VIS[0]],
    ]);
    expect(scene.nodes[2]!.children.map(({ label }) => label)).toEqual([
      'Firefox',
      'Chrome',
    ]);
  });

  it('colors one date category alike in every mosaic column, however it is written', () => {
    const scene = resolve(
      chart({
        shape: 'mosaic',
        groups: [{ column: 'g' }, { column: 'd' }],
        data: {
          columns: [
            string('g'),
            { id: 'd', label: 'd', type: 'date', role: 'dimension' },
            number('v'),
          ],
          rows: [
            ['a', '1970-01-02T00:00:00Z', 1],
            ['a', 0, 1],
            ['b', '1970-01-01T00:00:00Z', 1],
          ],
        },
      })
    );
    const color = (column: number, at: number) =>
      scene.nodes[column]!.children.find(({ source }) => source.rows[0] === at)!
        .color;
    expect(color(0, 1)).toBe(VIS[1]);
    expect(color(1, 2)).toBe(color(0, 1));
    expect(color(0, 0)).toBe(VIS[0]);
  });

  it('keeps a lone mosaic layer in row order', () => {
    expect(
      resolve(chart({ shape: 'mosaic' })).nodes.map(({ label }) => label)
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('adds a metric layer in metric order, keyed by column id', () => {
    const scene = resolve(named('Several metrics'));
    expect(scene.layers).toEqual([{ label: 'Metric' }]);
    expect(
      scene.nodes.map(({ key, label, metric, color, valueLabel }) => ({
        key,
        label,
        metric,
        color,
        valueLabel,
      }))
    ).toEqual([
      {
        key: 'used',
        label: 'Used',
        metric: 'used',
        color: '#F6726A',
        valueLabel: '12 GB',
      },
      {
        key: 'free',
        label: 'Free',
        metric: 'free',
        color: '#CAD3E2',
        valueLabel: '4 GB',
      },
    ]);
  });

  it('nests the metric layer under the groups', () => {
    const scene = resolve(
      chart({
        data: {
          columns: [string('g'), number('v'), number('w')],
          rows: [
            ['a', 1, 4],
            ['b', 2, 1],
          ],
        },
        metrics: [{ column: 'v' }, { column: 'w' }],
      })
    );
    expect(
      flat(scene.nodes).map(({ key, depth, value }) => [key, depth, value])
    ).toEqual([
      ['a', 1, 5],
      ['a:v', 2, 1],
      ['a:w', 2, 4],
      ['b', 1, 3],
      ['b:v', 2, 2],
      ['b:w', 2, 1],
    ]);
    expect(scene.legend.visible).toBe(true);
  });

  it('sums duplicate group rows into one slice that keeps every row', () => {
    const scene = resolve(
      chart({
        data: {
          columns: [string('g'), number('v')],
          rows: [
            ['a', 1],
            ['b', 1],
            ['a', 2],
          ],
        },
        interactions: { select: ['slice'] },
      })
    );
    expect(scene.nodes[0]).toMatchObject({
      label: 'a',
      value: 3,
      source: { rows: [0, 2], columns: ['g', 'v'] },
      selection: {
        target: 'slice',
        rows: [0, 2],
        columns: ['g'],
        values: { g: 'a' },
        description: 'g: a · v: 3',
      },
    });
  });

  it('sums each slice over its leaves in draw order, as an engine does', () => {
    const scene = resolve(
      chart({
        data: {
          columns: [string('g'), string('h'), number('v')],
          rows: [
            ['a', 'x', 0.1],
            ['a', 'y', 0.2],
            ['a', 'z', 0.3],
          ],
        },
        groups: [{ column: 'g' }, { column: 'h' }],
      })
    );
    expect(scene.nodes[0]!.value).toBe(0.3 + 0.2 + 0.1);
    expect(scene.total).toBe(0.3 + 0.2 + 0.1);
  });

  it('labels slices by share, value or nothing', () => {
    const shares = resolve(chart()).nodes.map(({ valueLabel }) => valueLabel);
    expect(shares).toEqual(['33.33%', '33.33%', '22.22%', '11.11%']);
    expect(
      resolve(chart({ labels: { percentDecimals: 0 } })).nodes[0]!.valueLabel
    ).toBe('33%');
    expect(
      resolve(chart({ labels: { values: 'value' } })).nodes[0]!.valueLabel
    ).toBe('3');
    expect(
      resolve(chart({ labels: { categories: 'hidden', values: 'value' } }))
        .nodes[0]!.valueLabel
    ).toBe('');
  });

  it('uses display strings for names and for a one-row value', () => {
    const scene = resolve(
      named('Selectable, pre-rendered and with provenance')
    );
    expect(scene.nodes.map(({ label }) => label)).toEqual([
      'Linux (all distributions)',
      'Windows',
      'macOS',
    ]);
  });

  it('counts a missing value as 0', () => {
    const scene = resolve(named('Huge, tiny and zero slices'));
    expect(scene.nodes.at(-1)).toMatchObject({
      label: 'unknown',
      value: 0,
      valueLabel: '0%',
    });
  });

  it('draws nothing but Lens’s note for a negative value', () => {
    const scene = resolve(named('Negative values'));
    expect(scene.empty).toEqual({
      reason: 'negative',
      text: "Pie chart can't render with negative values.",
    });
    expect(scene.nodes).toEqual([]);
    expect(scene.legend.visible).toBe(false);
  });

  it('says there are no results with no rows, or only zeros', () => {
    expect(resolve(named('No rows')).empty).toEqual({
      reason: 'noResults',
      text: 'No results found',
    });
    expect(
      resolve(
        chart({
          data: { columns: [string('g'), number('v')], rows: [['a', 0]] },
        })
      ).empty?.reason
    ).toBe('noResults');
  });

  it('shows the legend on a waffle, with values, and on a multi-layer pie or donut', () => {
    const waffle = resolve(named('Waffle by day'));
    expect(waffle.legend.visible).toBe(true);
    expect(
      waffle.legend.items.map(({ label, value }) => [label, value])
    ).toEqual([
      ['Tue, Nov 3', '42'],
      ['Wed, Nov 4', '17'],
      ['Thu, Nov 5', '28'],
      ['Fri, Nov 6', '9'],
    ]);
    expect(resolve(chart()).legend.visible).toBe(false);
    expect(resolve(named('Treemap')).legend.visible).toBe(false);
    expect(resolve(named('Nested pie with values')).legend.visible).toBe(true);
  });

  it('lists the outermost layer in row order, or every slice when nested', () => {
    expect(resolve(chart()).legend.items.map(({ label }) => label)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    const nested = resolve(named('Nested pie with values')).legend;
    expect(nested.nested).toBe(true);
    expect(nested.items.map(({ label, depth }) => [label, depth])).toEqual([
      ['us-east-1', 1],
      ['web-01', 2],
      ['web-02', 2],
      ['eu-west-1', 1],
      ['web-03', 2],
      ['web-04', 2],
      ['ap-south-1', 1],
      ['web-05', 2],
    ]);
  });

  it('gives only a donut a hole', () => {
    expect(resolve(chart({ shape: 'donut' })).donutHole).toBe(0.3);
    expect(
      resolve(named('Donut with Other and missing buckets')).donutHole
    ).toBe(0.54);
    expect(resolve(chart()).donutHole).toBe(0);
  });

  it('offers no selection unless the node offers slices', () => {
    const scene = resolve(chart());
    expect(flat(scene.nodes).some(({ selection }) => selection)).toBe(false);
    expect(scene.legend.items.some(({ selection }) => selection)).toBe(false);
  });

  it('builds a tooltip down the slice’s path', () => {
    const [region] = resolve(named('Nested pie with values')).nodes;
    expect(region!.children[0]!.tooltip.entries).toEqual([
      { label: 'us-east-1', value: '8 GB\u00A0(67.8%)', color: VIS[0] },
      { label: 'web-01', value: '5 GB\u00A0(42.37%)', color: '#65D1CC' },
    ]);
  });

  it('summarizes the outermost slices', () => {
    expect(resolve(named('Pie')).summary).toBe(
      'Requests by response code: Count of records by http.response.status_code: 200 78.96%, 404 11.3%, 301 6.15%, 500 3.59%.'
    );
  });
});
