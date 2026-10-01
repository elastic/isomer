/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, space, type } from '../base';
import { literal } from '../scale';

import { render } from './render';

/** Grid shapes by surface count, named columns by rows. */
export const renderGridShapes = [
  'twoByOne',
  'threeByOne',
  'twoByTwo',
  'threeByTwo',
] as const;

export type RenderGridShape = (typeof renderGridShapes)[number];

// One row sizes each panel to 16:9 and centers the row; two rows stretch panels to fill.
const shape = (columns: number, rows: 1 | 2, scale: number) =>
  ({
    columns: literal(String(columns)),
    rows: literal(String(rows)),
    rowTrack: literal(rows === 1 ? 'auto' : 'minmax(0, 1fr)'),
    panelAspect: rows === 1 ? render.panel.aspect : literal('auto'),
    panelGrow: literal(rows === 1 ? '0' : '1'),
    scale: literal(String(scale)),
  }) as const;

export const renderGrid = {
  gap: space.px40,
  cellGap: space.px14,
  headGap: space.px16,
  name: {
    family: font.family.mono,
    size: font.size.px30,
    weight: font.weight.medium,
    lineHeight: font.lineHeight.body,
  },
  caption: { ...type.chrome, size: font.size.px24 },
  // The largest scale each shape draws a slide at: one cell's width across the frame body.
  shape: {
    twoByOne: shape(2, 1, 0.42),
    threeByOne: shape(3, 1, 0.27),
    twoByTwo: shape(2, 2, 0.42),
    threeByTwo: shape(3, 2, 0.27),
  } satisfies Record<RenderGridShape, ReturnType<typeof shape>>,
  /** A tile shows more of a surface's output at this scale. */
  outputScale: literal('0.7'),
} as const;
