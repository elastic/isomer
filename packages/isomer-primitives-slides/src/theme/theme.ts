/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { agenda } from './components/agenda';
import { bars } from './components/bars';
import { bulletList } from './components/bullet_list';
import { closing } from './components/closing';
import { code } from './components/code';
import { definitions } from './components/definitions';
import { delta } from './components/delta';
import { fanout } from './components/fanout';
import { frame } from './components/frame';
import { heading } from './components/heading';
import { list } from './components/list';
import { marks } from './components/marks';
import { quote } from './components/quote';
import { section } from './components/section';
import {
  connector,
  glyph,
  label,
  link,
  placeholder,
  tone,
} from './components/shared';
import { source } from './components/source';
import { split } from './components/split';
import { stack } from './components/stack';
import { stat } from './components/stat';
import { statement } from './components/statement';
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
  link,
  label,
  connector,
  tone,
  placeholder,
  marks,
  agenda,
  bars,
  bulletList,
  closing,
  code,
  definitions,
  delta,
  fanout,
  frame,
  heading,
  list,
  quote,
  section,
  source,
  split,
  stack,
  stat,
  statement,
  stats,
  territoryGroup,
  title,
} as const;

export type SlideColorName = keyof typeof color;
