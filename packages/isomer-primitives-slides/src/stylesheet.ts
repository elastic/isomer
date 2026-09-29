/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { codeModule } from './primitives/slide_code/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { graphModule } from './primitives/slide_graph/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { roadmapModule } from './primitives/slide_roadmap/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { timelineModule } from './primitives/slide_timeline/styles';
import { titleModule } from './primitives/slide_title/styles';
import { treeModule } from './primitives/slide_tree/styles';
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
  bullets: bulletsModule,
  code: codeModule,
  frame: frameModule,
  graph: graphModule,
  heading: headingModule,
  roadmap: roadmapModule,
  split: splitModule,
  stack: stackModule,
  territory: territoryModule,
  timeline: timelineModule,
  title: titleModule,
  tree: treeModule,
};

/** Hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
