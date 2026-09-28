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
import { graph } from './components/graph';
import { heading } from './components/heading';
import { lanes } from './components/lanes';
import { layers } from './components/layers';
import { list } from './components/list';
import { marks } from './components/marks';
import { matrix } from './components/matrix';
import { pipeline } from './components/pipeline';
import { quadrant } from './components/quadrant';
import { quote } from './components/quote';
import { roadmap } from './components/roadmap';
import { section } from './components/section';
import { sequence } from './components/sequence';
import { connector, label, panel, placeholder } from './components/shared';
import { source } from './components/source';
import { split } from './components/split';
import { stack } from './components/stack';
import { stat } from './components/stat';
import { statement } from './components/statement';
import { stats } from './components/stats';
import { table } from './components/table';
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
  frame,
  label,
  placeholder,
  panel,
  connector,
  marks,
  agenda,
  bars,
  bulletList,
  closing,
  code,
  definitions,
  delta,
  fanout,
  graph,
  heading,
  lanes,
  layers,
  list,
  matrix,
  pipeline,
  quadrant,
  quote,
  roadmap,
  section,
  sequence,
  source,
  split,
  stack,
  stat,
  statement,
  stats,
  table,
  territoryGroup,
  timeline,
  title,
  tree,
} as const;

/** Scheme-varying color names in {@link SLIDE_THEME}. */
export type SlideColorName = keyof typeof color;
