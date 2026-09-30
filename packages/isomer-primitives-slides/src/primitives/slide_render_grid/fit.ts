/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import {
  renderGrid,
  type RenderGridShape,
} from '../../theme/components/render_grid';
import { scalePx } from '../../theme/scale';
import { lineBox, measureText, trackWidth } from '../size';
import { embeddedScale } from '../slide_render/fit';

import type { SlideRenderGridNode } from './types';

export const shapeFor = (count: number): RenderGridShape =>
  count <= 2
    ? 'twoByOne'
    : count === 3
      ? 'threeByOne'
      : count === 4
        ? 'twoByTwo'
        : 'threeByTwo';

/** Panels of a shape with more than one row stretch to fill their cells. */
export const fillsCell = (shape: RenderGridShape): boolean =>
  scalePx(renderGrid.shape[shape].rows) > 1;

/** The tallest tile head: its surface name, and its caption wrapped beside the name across `cell`. */
const headHeight = (
  tiles: SlideRenderGridNode['tiles'],
  cell: number
): number =>
  Math.max(
    ...tiles.map(({ surface, caption }) => {
      const name = measureText(surface, renderGrid.name).widest;
      return Math.max(
        lineBox(renderGrid.name),
        Math.max(
          1,
          measureText(
            caption,
            renderGrid.caption,
            Math.max(1, cell - name - scalePx(renderGrid.headGap))
          ).lines
        ) * lineBox(renderGrid.caption)
      );
    })
  );

/** The scale each tile draws its slide at in `layout`, under the tallest head. */
export const tileScale = (
  { tiles }: SlideRenderGridNode,
  { width, height }: SlideLayout
): number => {
  const { columns, rows, scale } = renderGrid.shape[shapeFor(tiles.length)];
  const across = scalePx(columns);
  const down = scalePx(rows);
  const gap = scalePx(renderGrid.gap);
  const cell = trackWidth(width, Array<number>(across).fill(1), renderGrid.gap);
  return embeddedScale(
    {
      width: cell,
      height:
        (height - (down - 1) * gap) / down -
        headHeight(tiles, cell) -
        scalePx(renderGrid.cellGap),
    },
    scale
  );
};
