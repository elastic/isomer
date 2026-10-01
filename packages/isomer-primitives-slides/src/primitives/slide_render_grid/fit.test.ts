/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import { renderGrid } from '../../theme/components/render_grid';
import { openBody } from '../layout';
import { trackWidth } from '../size';

import { example } from './examples';
import { headHeight } from './fit';

const captioned = (caption: string) => ({
  ...example,
  tiles: example.tiles.map((tile) => ({ ...tile, caption })),
});

const cell = trackWidth(openBody.width, [1, 1, 1], renderGrid.gap);

describe('slideRenderGrid head', () => {
  it.each([
    ['one line', 'Driver SMS'],
    [
      'a caption that wraps',
      'A caption long enough to wrap onto a second and maybe a third line in a narrow pane of the slide',
    ],
  ])('matches what takumi draws, with %s', async (_, caption) => {
    const node = captioned(caption);
    const grid = nodeBox(await measured(slideOf(node)), 'slideRenderGrid');
    const drawn = Math.max(
      ...grid.children.map(({ children: [head] }) => head?.height ?? NaN)
    );
    const estimate = headHeight(node.tiles, cell);
    expect(estimate).toBeGreaterThanOrEqual(drawn);
    expect(estimate - drawn).toBeLessThan(2);
    expect(await findings(slideOf(node))).toEqual([]);
  });
});
