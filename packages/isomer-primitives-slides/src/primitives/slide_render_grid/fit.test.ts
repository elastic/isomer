/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import { renderGrid } from '../../theme/components/render_grid';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { lineBox, measureText, trackWidth } from '../size';

import { example } from './examples';
import { headHeight } from './fit';

const captioned = (caption: string) => ({
  ...example,
  tiles: example.tiles.map((tile) => ({ ...tile, caption })),
});

const inPane = (node: object) => ({
  type: 'slideSplit',
  panes: [
    { label: 'Pane', items: [node] },
    { items: [{ type: 'slideBulletList', items: ['One', 'Two'] }] },
  ],
});

const long =
  'A caption long enough to wrap onto a second and maybe a third line in a narrow pane of the slide';

describe('slideRenderGrid head', () => {
  it.each([
    ['across the slide, one line', 'Driver SMS', false],
    ['across the slide, a caption that wraps', long, false],
    ['in half a split, short captions under some names', undefined, true],
    ['in half a split, a caption that wraps under its name', long, true],
  ])('matches what takumi draws %s', async (_, caption, paned) => {
    const node = caption ? captioned(caption) : example;
    const slide = slideOf(paned ? inPane(node) : node);
    const grid = nodeBox(await measured(slide), 'slideRenderGrid');
    const drawn = Math.max(
      ...grid.children.map(({ children: [head] }) => head?.height ?? NaN)
    );
    const cell = trackWidth(
      paned ? grid.width : openBody.width,
      [1, 1, 1],
      renderGrid.gap
    );
    const estimate = headHeight(node.tiles, cell);
    expect(estimate).toBeGreaterThanOrEqual(drawn);
    expect(estimate - drawn).toBeLessThan(2);
    expect(await findings(slide)).toEqual([]);
  });
});

describe('slideRenderGrid caption placement', () => {
  const tile = { surface: 'markdown', caption: 'The wiki' } as const;
  const edge =
    measureText(tile.surface, renderGrid.name).widest +
    scalePx(renderGrid.headGap) +
    scalePx(renderGrid.captionMinWidth);

  it('sets a caption beside the name with exactly the minimum width left', () => {
    expect(headHeight([tile], edge)).toBe(lineBox(renderGrid.name));
  });

  it('sets it on its own line with a pixel less', () => {
    expect(headHeight([tile], edge - 1)).toBe(
      lineBox(renderGrid.name) + Math.ceil(lineBox(renderGrid.caption))
    );
  });
});
