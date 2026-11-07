/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { MetricNode } from '../schema/metric';

import { resolveChart } from './resolve';

const withBackground = (background: MetricNode['background']): MetricNode => ({
  type: 'metric',
  data: {
    columns: [
      { id: 'v', label: 'Value', type: 'number', role: 'metric' },
      { id: 'max', label: 'Max', type: 'number', role: 'metric' },
    ],
    rows: [[5, 10]],
  },
  value: { column: 'v', color: { light: '#f00', dark: '#f00' } },
  background,
});
const buckets = (): MetricNode => ({
  type: 'metric',
  data: {
    columns: [
      { id: 'b', label: 'Bucket', type: 'string', role: 'dimension' },
      { id: 'v', label: 'Value', type: 'number', role: 'metric' },
    ],
    rows: [
      ['a:b', 10],
      [null, 20],
    ],
  },
  breakdown: { column: 'b' },
  value: { column: 'v' },
});
const blue = { light: '#0000FF', dark: '#0000FF' };

describe('metric colors', () => {
  it('excludes every finite band upper bound', () => {
    const node = buckets();
    node.value.color = 'bands';
    node.colors = { bands: [{ from: 0, to: 10, color: blue }] };
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.background).toBe(
      '#FFFFFF'
    );
  });

  it('resolves escaped and missing metric bucket colors', () => {
    const node = buckets();
    node.colors = { byKey: { 'a\\:b': blue, '\\null': { token: 'axis' } } };
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.tiles.map(({ background }) => background)).toEqual([
      '#0000FF',
      '#CAD3E2',
    ]);
  });

  it('chooses text against the composited metric background', () => {
    const node = buckets();
    node.value.color = { light: '#00000000', dark: '#FFFFFF00' };
    expect(resolveChart(node, { scheme: 'dark' }).tiles[0]?.value.color).toBe(
      '#B4C1D5'
    );
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.value.color).toBe(
      '#384861'
    );
  });

  it('ignores inherited entries in color maps', () => {
    const node = buckets();
    node.data.rows = [['constructor', 1]];
    node.colors = { byKey: {} };
    expect(resolveChart(node, { scheme: 'light' }).tiles[0]?.background).toBe(
      '#FFFFFF'
    );
  });
});

describe('metric overlays', () => {
  it.each(['light', 'dark'] as const)(
    'keeps metric overlays visible in %s',
    (scheme) => {
      const progress = resolveChart(
        withBackground({ kind: 'bar', max: 'max' }),
        {
          scheme,
        }
      ).tiles[0]!;
      expect(progress.background).toBe('#ff0000');
      expect(progress.progress?.fraction).toBe(0.5);
      expect(progress.progress?.color).not.toBe(progress.background);
      const trend = resolveChart(
        withBackground({
          kind: 'trend',
          x: 't',
          y: 'v',
          data: {
            columns: [
              { id: 't', label: 'Time', type: 'date', role: 'dimension' },
              { id: 'v', label: 'Value', type: 'number', role: 'metric' },
            ],
            rows: [
              [0, 1],
              [1, 2],
            ],
          },
        }),
        { scheme }
      ).tiles[0]!;
      expect(trend.trend?.color).not.toBe(trend.background);
    }
  );

  it.each(['bar', 'trend'] as const)(
    'contrasts a %s overlay against an opaque long-form background',
    (kind) => {
      const node = withBackground(
        kind === 'bar'
          ? { kind, max: 'max' }
          : {
              kind,
              x: 't',
              y: 'v',
              data: {
                columns: [
                  { id: 't', label: 'Time', type: 'date', role: 'dimension' },
                  { id: 'v', label: 'Value', type: 'number', role: 'metric' },
                ],
                rows: [
                  [0, 1],
                  [1, 2],
                ],
              },
            }
      );
      node.value.color = { light: '#ff0000', dark: '#ff0000' };
      const tile = resolveChart(node, { scheme: 'light' }).tiles[0]!;
      expect(
        kind === 'bar' ? tile.progress?.color : tile.trend?.color
      ).not.toBe(tile.background);
    }
  );

  it('reads multivalue values and bar maxima at their first non-null value', () => {
    const tile = resolveChart(
      {
        ...withBackground({ kind: 'bar', max: 'max' }),
        data: {
          columns: [
            {
              id: 'v',
              label: 'V',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
            {
              id: 'max',
              label: 'Max',
              type: 'number',
              role: 'metric',
              multivalue: true,
            },
          ],
          rows: [
            [
              [5, 6],
              [10, 20],
            ],
          ],
        },
      },
      { scheme: 'light' }
    ).tiles[0]!;
    expect(tile.progress?.fraction).toBe(0.5);
  });
});

describe('metric trends', () => {
  it('matches separately allocated multivalue trend buckets', () => {
    const node = buckets();
    node.data.columns[0]!.multivalue = true;
    node.data.rows = [[['a', 'b'], 10]];
    node.background = {
      kind: 'trend',
      breakdown: 'b',
      x: 'x',
      y: 'v',
      data: {
        columns: [
          ...node.data.columns,
          { id: 'x', label: 'Time', type: 'date', role: 'dimension' },
        ],
        rows: [
          [['a', 'b'], 1, 0],
          [['a', 'b'], 2, 1000],
          [['c'], 3, 2000],
        ],
      },
    };
    expect(
      resolveChart(node, { scheme: 'light' }).tiles[0]?.trend?.points
    ).toEqual([
      { x: 0, y: 1 },
      { x: 1000, y: 2 },
    ]);
  });

  it('adapts multivalue metric trend coordinates', () => {
    const node = withBackground({
      kind: 'trend',
      x: 't',
      y: 'v',
      data: {
        columns: [
          {
            id: 't',
            label: 'Time',
            type: 'date',
            role: 'dimension',
            multivalue: true,
          },
          {
            id: 'v',
            label: 'Value',
            type: 'number',
            role: 'metric',
            multivalue: true,
          },
        ],
        rows: [
          [
            [null, 1000, 2000],
            [null, 5, 10],
          ],
        ],
      },
    });
    expect(
      resolveChart(node, { scheme: 'light' }).tiles[0]?.trend?.points
    ).toEqual([{ x: 1000, y: 5 }]);
  });
});
