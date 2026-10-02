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

const captionLines = (caption: string, width: number): number =>
  Math.max(1, measureText(caption, renderGrid.caption, width).lines);

/** How wide one tile is in `layout`. */
export const cellWidth = (
  { tiles }: SlideRenderGridNode,
  { width }: SlideLayout
): number =>
  trackWidth(
    width,
    Array<number>(
      scalePx(renderGrid.shape[shapeFor(tiles.length)].columns)
    ).fill(1),
    renderGrid.gap
  );

/** The width left for a caption beside its surface name in `cell`. */
const besideName = (surface: string, cell: number): number =>
  cell -
  measureText(surface, renderGrid.name).widest -
  scalePx(renderGrid.headGap);

/** Whether a caption keeps `captionMinWidth` beside its surface name in `cell`; if not, it takes its own lines under the name. */
export const captionBeside = (surface: string, cell: number): boolean =>
  besideName(surface, cell) >= scalePx(renderGrid.captionMinWidth);

/** The tallest tile head across `cell`: the surface name, then the caption beside it, each line after the first, which shares the name's baseline, a caption line box below, or wrapped across `cell` under it. */
export const headHeight = (
  tiles: SlideRenderGridNode['tiles'],
  cell: number
): number =>
  Math.max(
    ...tiles.map(({ surface, caption }) => {
      const nameLine = lineBox(renderGrid.name);
      const captionLine = lineBox(renderGrid.caption);
      if (!captionBeside(surface, cell)) {
        // takumi draws a text block at its line boxes' height rounded up to a whole pixel.
        return nameLine + Math.ceil(captionLines(caption, cell) * captionLine);
      }
      const lines = captionLines(caption, besideName(surface, cell));
      return Math.max(
        nameLine + (lines - 1) * captionLine,
        lines * captionLine
      );
    })
  );

/** The scale each tile draws its slide at in `layout`, under the tallest head. */
export const tileScale = (
  node: SlideRenderGridNode,
  layout: SlideLayout
): number => {
  const { tiles } = node;
  const { height } = layout;
  const { rows, scale } = renderGrid.shape[shapeFor(tiles.length)];
  const down = scalePx(rows);
  const gap = scalePx(renderGrid.gap);
  const cell = cellWidth(node, layout);
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
