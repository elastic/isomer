/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { annotatedRenderModule } from './primitives/slide_annotated_render/styles';
import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { codeModule } from './primitives/slide_code/styles';
import { columnsModule } from './primitives/slide_columns/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { renderModule } from './primitives/slide_render/styles';
import { renderGridModule } from './primitives/slide_render_grid/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { titleModule } from './primitives/slide_title/styles';
import { windowModule } from './primitives/slide_window/styles';
import { slideDistillery } from './theme/distillery';
import {
  connectorModule,
  deckRootModule,
  labelModule,
  layoutModule,
  marksModule,
  tonesModule,
} from './theme/modules';

/** Every style module in the pack, keyed by module name. */
export const slideModules = {
  deckRoot: deckRootModule,
  layout: layoutModule,
  tones: tonesModule,
  label: labelModule,
  connector: connectorModule,
  marks: marksModule,
  annotatedRender: annotatedRenderModule,
  bullets: bulletsModule,
  code: codeModule,
  columns: columnsModule,
  frame: frameModule,
  heading: headingModule,
  render: renderModule,
  renderGrid: renderGridModule,
  split: splitModule,
  stack: stackModule,
  territory: territoryModule,
  title: titleModule,
  window: windowModule,
};

/** Hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
