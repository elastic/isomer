/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { bulletList } from './components/bullet_list';
import { code } from './components/code';
import { frame } from './components/frame';
import { graph } from './components/graph';
import { heading } from './components/heading';
import { marks } from './components/marks';
import { roadmap } from './components/roadmap';
import { connector, glyph, label, tone } from './components/shared';
import { split } from './components/split';
import { stack } from './components/stack';
import { territoryGroup } from './components/territory_group';
import { timeline } from './components/timeline';
import { title } from './components/title';
import { tree } from './components/tree';

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
  bulletList,
  code,
  graph,
  heading,
  roadmap,
  split,
  stack,
  territoryGroup,
  timeline,
  title,
  tree,
} as const;

export type SlideColorName = keyof typeof color;
