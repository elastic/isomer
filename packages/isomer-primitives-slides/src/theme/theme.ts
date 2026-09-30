/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { annotatedRender } from './components/annotated_render';
import { bulletList } from './components/bullet_list';
import { code } from './components/code';
import { columns } from './components/columns';
import { frame } from './components/frame';
import { heading } from './components/heading';
import { marks } from './components/marks';
import { render } from './components/render';
import { renderGrid } from './components/render_grid';
import { connector, glyph, label, tone } from './components/shared';
import { split } from './components/split';
import { stack } from './components/stack';
import { territoryGroup } from './components/territory_group';
import { title } from './components/title';
import { window } from './components/window';

/**
 * Every value the pack renders, in one tree. `lightDark` leaves become
 * scheme-varying custom properties; every other leaf is a `ScaleToken` that
 * inlines its literal. `docs/theme.md` covers the leaf kinds.
 */
export const SLIDE_THEME = {
  color,
  inverse,
  space,
  radius,
  stroke,
  font,
  type,
  glyph,
  label,
  connector,
  tone,
  marks,
  frame,
  annotatedRender,
  bulletList,
  code,
  columns,
  heading,
  render,
  renderGrid,
  split,
  stack,
  territoryGroup,
  title,
  window,
} as const;

export type SlideColorName = keyof typeof color;
