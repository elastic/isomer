/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { agenda } from './components/agenda';
import { annotatedRender } from './components/annotated_render';
import { bars } from './components/bars';
import { bullets } from './components/bullets';
import { closing } from './components/closing';
import { code } from './components/code';
import { columns } from './components/columns';
import { command } from './components/command';
import { definitions } from './components/definitions';
import { delta } from './components/delta';
import { diff } from './components/diff';
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
import { render } from './components/render';
import { renderGrid } from './components/render_grid';
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
import { territory } from './components/territory';
import { timeline } from './components/timeline';
import { title } from './components/title';
import { transcript } from './components/transcript';
import { tree } from './components/tree';
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
  frame,
  label,
  placeholder,
  panel,
  connector,
  marks,
  agenda,
  bars,
  annotatedRender,
  bullets,
  closing,
  code,
  columns,
  command,
  definitions,
  delta,
  diff,
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
  render,
  renderGrid,
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
  territory,
  timeline,
  title,
  transcript,
  tree,
  window,
} as const;

/** Scheme-varying color names in {@link SLIDE_THEME}. */
export type SlideColorName = keyof typeof color;
