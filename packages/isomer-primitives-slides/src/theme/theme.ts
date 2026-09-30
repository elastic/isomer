/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { bars } from './components/bars';
import { bulletList } from './components/bullet_list';
import { code } from './components/code';
import { delta } from './components/delta';
import { frame } from './components/frame';
import { heading } from './components/heading';
import { marks } from './components/marks';
import {
  connector,
  glyph,
  label,
  placeholder,
  tone,
} from './components/shared';
import { split } from './components/split';
import { stack } from './components/stack';
import { stat } from './components/stat';
import { stats } from './components/stats';
import { territoryGroup } from './components/territory_group';
import { title } from './components/title';

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
  placeholder,
  marks,
  frame,
  bars,
  bulletList,
  code,
  delta,
  heading,
  split,
  stack,
  stat,
  stats,
  territoryGroup,
  title,
} as const;

export type SlideColorName = keyof typeof color;
