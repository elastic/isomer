/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected values come from the tagCloud contract (docs/tag-cloud.md) and
// Lens's tag cloud: weights from `calculateWeight`, palette ranks by the first
// row a tag shows in, orientations from `ORIENTATIONS`, fonts 18 to 72 px.

import { describe, expect, it } from 'vitest';

import type { Cell, ChartColumn } from '../schema/data';
import type { TagCloudNode } from '../schema/tag_cloud';

import { resolveChart } from './resolve';
import { CATEGORICAL_PALETTE } from './theme';

const columns: ChartColumn[] = [
  { id: 'tag', label: 'Tag', type: 'string', role: 'dimension' },
  { id: 'n', label: 'Count', type: 'number', role: 'metric' },
];

const cloud = (
  rows: Cell[][],
  overrides: Partial<TagCloudNode> = {}
): TagCloudNode => ({
  type: 'tagCloud',
  data: { columns, rows },
  tags: { column: 'tag' },
  metric: { column: 'n' },
  ...overrides,
});

describe('resolveTagCloud', () => {
  it('weighs each word by its place between the smallest and largest value', () => {
    const scene = resolveChart(
      cloud([
        ['a', 10],
        ['b', 20],
        ['c', 30],
        ['d', null],
      ]),
      { scheme: 'light' }
    );
    expect(scene.words.map(({ text, weight }) => [text, weight])).toEqual([
      ['a', 0],
      ['b', 0.5],
      ['c', 1],
      ['d', 0],
    ]);
  });

  it('weighs a lone word whole, and words of one value at nothing, as Lens does', () => {
    expect(
      resolveChart(cloud([['a', 3]]), { scheme: 'light' }).words[0]!.weight
    ).toBe(1);
    expect(
      resolveChart(
        cloud([
          ['a', 3],
          ['b', 3],
        ]),
        { scheme: 'light' }
      ).words.map(({ weight }) => weight)
    ).toEqual([0, 0]);
  });

  it('colors a tag by its stated key, else by the first row it shows in', () => {
    const scene = resolveChart(
      cloud(
        [
          ['a', 1],
          ['b', 2],
          [null, 3],
          ['a', 4],
        ],
        {
          colors: {
            byKey: { '\\null': { light: '#111111', dark: '#EEEEEE' } },
          },
        }
      ),
      { scheme: 'dark' }
    );
    expect(scene.words.map(({ text, color }) => [text, color])).toEqual([
      ['a', CATEGORICAL_PALETTE[0]],
      ['b', CATEGORICAL_PALETTE[1]],
      ['(null)', '#EEEEEE'],
      ['a', CATEGORICAL_PALETTE[0]],
    ]);
  });

  it('writes tags and values as displayed, and selects a word only when offered', () => {
    const node = cloud(
      [
        ['x1', 5],
        ['x2', 7],
      ],
      { interactions: { select: ['tag'] } }
    );
    node.data.display = { tag: ['One', 'Two'] };
    const scene = resolveChart(node, { scheme: 'light' });
    expect(scene.words[1]).toMatchObject({
      text: 'Two',
      value: 7,
      valueText: '7',
      description: 'Tag: Two · Count: 7',
      source: { rows: [1], columns: ['tag', 'n'] },
      selection: {
        target: 'tag',
        rows: [1],
        columns: ['tag'],
        values: { tag: 'x2' },
        description: 'Tag: Two · Count: 7',
      },
    });
    expect(
      resolveChart({ ...node, interactions: undefined }, { scheme: 'light' })
        .words[1]!.selection
    ).toBeUndefined();
  });

  it('turns words as Lens’s orientations do, at 18 to 72 px on a linear scale by default', () => {
    const scene = resolveChart(cloud([['a', 1]]), { scheme: 'light' });
    expect(scene).toMatchObject({
      scale: 'linear',
      angles: { start: 0, end: 0, count: 360 },
      fontSize: { min: 18, max: 72 },
      label: 'Tag - Count',
    });
    expect(
      resolveChart(cloud([['a', 1]], { orientation: 'rightAngled' }), {
        scheme: 'light',
      }).angles
    ).toEqual({ start: 0, end: 90, count: 2 });
    const set = resolveChart(
      cloud([['a', 1]], {
        orientation: 'multiple',
        scale: 'log',
        fontSize: { min: 10, max: 20 },
        showLabel: false,
      }),
      { scheme: 'light' }
    );
    expect(set).toMatchObject({
      scale: 'log',
      angles: { start: 0, end: -90, count: 12 },
      fontSize: { min: 10, max: 20 },
    });
    expect(set.label).toBeUndefined();
  });

  it('says there is nothing to draw with no rows', () => {
    const scene = resolveChart(cloud([], { title: 'Tags' }), {
      scheme: 'light',
    });
    expect(scene.empty).toEqual({
      reason: 'noResults',
      text: 'No results found',
    });
    expect(scene.label).toBeUndefined();
    expect(scene.summary).toBe('Tags: Count by Tag has no data.');
  });

  it('names the three largest words in its summary', () => {
    expect(
      resolveChart(
        cloud([
          ['a', 1],
          ['b', 4],
          ['c', 3],
          ['d', 2],
        ]),
        { scheme: 'light' }
      ).summary
    ).toBe('Count by Tag, 4 tags, largest b (4), c (3), d (2).');
  });
});
