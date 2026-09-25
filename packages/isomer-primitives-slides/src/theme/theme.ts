/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { color, font, inverse, radius, space, stroke, type } from './base';
import { bullets } from './components/bullets';
import { closing } from './components/closing';
import { code } from './components/code';
import { columns } from './components/columns';
import { definitions } from './components/definitions';
import { fanout } from './components/fanout';
import { frame } from './components/frame';
import { graph } from './components/graph';
import { heading } from './components/heading';
import { lanes } from './components/lanes';
import { list } from './components/list';
import { pipeline } from './components/pipeline';
import { render } from './components/render';
import { renderGrid } from './components/render_grid';
import { section } from './components/section';
import { connector, label, panel, placeholder } from './components/shared';
import { split } from './components/split';
import { stack } from './components/stack';
import { stat } from './components/stat';
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
  bullets,
  closing,
  code,
  columns,
  definitions,
  fanout,
  graph,
  heading,
  lanes,
  list,
  pipeline,
  render,
  renderGrid,
  section,
  split,
  stack,
  stat,
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
