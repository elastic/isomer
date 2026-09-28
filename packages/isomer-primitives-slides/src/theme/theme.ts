/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { agenda } from './components/agenda';
import { bulletList } from './components/bullet_list';
import { closing } from './components/closing';
import { code } from './components/code';
import { definitions } from './components/definitions';
import { fanout } from './components/fanout';
import { frame } from './components/frame';
import { heading } from './components/heading';
import { list } from './components/list';
import { marks } from './components/marks';
import { quote } from './components/quote';
import { section } from './components/section';
import { connector, label, panel, placeholder } from './components/shared';
import { source } from './components/source';
import { split } from './components/split';
import { stack } from './components/stack';
import { statement } from './components/statement';
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
  frame,
  label,
  placeholder,
  panel,
  connector,
  marks,
  agenda,
  bulletList,
  closing,
  code,
  definitions,
  fanout,
  heading,
  list,
  quote,
  section,
  source,
  split,
  stack,
  statement,
  territoryGroup,
  title,
} as const;

/** Scheme-varying color names in {@link SLIDE_THEME}. */
export type SlideColorName = keyof typeof color;
