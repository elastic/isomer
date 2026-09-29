/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { barsModule } from './primitives/slide_bars/styles';
import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { codeModule } from './primitives/slide_code/styles';
import { deltaModule } from './primitives/slide_delta/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { matrixModule } from './primitives/slide_matrix/styles';
import { quadrantModule } from './primitives/slide_quadrant/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { statModule } from './primitives/slide_stat/styles';
import { statsModule } from './primitives/slide_stats/styles';
import { tableModule } from './primitives/slide_table/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { titleModule } from './primitives/slide_title/styles';
import { slideDistillery } from './theme/distillery';
import {
  connectorModule,
  deckRootModule,
  labelModule,
  layoutModule,
  marksModule,
  placeholderModule,
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
  placeholder: placeholderModule,
  bars: barsModule,
  bullets: bulletsModule,
  code: codeModule,
  delta: deltaModule,
  frame: frameModule,
  heading: headingModule,
  matrix: matrixModule,
  quadrant: quadrantModule,
  split: splitModule,
  stack: stackModule,
  stat: statModule,
  stats: statsModule,
  table: tableModule,
  territory: territoryModule,
  title: titleModule,
};

/** Hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
