/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { closingModule } from './primitives/slide_closing/styles';
import { codeModule } from './primitives/slide_code/styles';
import { columnsModule } from './primitives/slide_columns/styles';
import { definitionsModule } from './primitives/slide_definitions/styles';
import { fanoutModule } from './primitives/slide_fanout/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { graphModule } from './primitives/slide_graph/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { lanesModule } from './primitives/slide_lanes/styles';
import { listModule } from './primitives/slide_list/styles';
import { pipelineModule } from './primitives/slide_pipeline/styles';
import { renderModule } from './primitives/slide_render/styles';
import { renderGridModule } from './primitives/slide_render_grid/styles';
import { sectionModule } from './primitives/slide_section/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { statModule } from './primitives/slide_stat/styles';
import { statsModule } from './primitives/slide_stats/styles';
import { tableModule } from './primitives/slide_table/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { timelineModule } from './primitives/slide_timeline/styles';
import { titleModule } from './primitives/slide_title/styles';
import { transcriptModule } from './primitives/slide_transcript/styles';
import { treeModule } from './primitives/slide_tree/styles';
import { windowModule } from './primitives/slide_window/styles';
import { slideDistillery } from './theme/distillery';
import {
  connectorModule,
  deckRootModule,
  labelModule,
  layoutModule,
  placeholderModule,
  tonesModule,
} from './theme/modules';

/** Every style module in the pack, keyed by module name. */
export const slideModules = {
  deckRoot: deckRootModule,
  layout: layoutModule,
  tones: tonesModule,
  label: labelModule,
  placeholder: placeholderModule,
  connector: connectorModule,
  bullets: bulletsModule,
  closing: closingModule,
  code: codeModule,
  columns: columnsModule,
  definitions: definitionsModule,
  fanout: fanoutModule,
  frame: frameModule,
  graph: graphModule,
  heading: headingModule,
  lanes: lanesModule,
  list: listModule,
  pipeline: pipelineModule,
  render: renderModule,
  renderGrid: renderGridModule,
  section: sectionModule,
  split: splitModule,
  stack: stackModule,
  stat: statModule,
  stats: statsModule,
  table: tableModule,
  territory: territoryModule,
  timeline: timelineModule,
  title: titleModule,
  transcript: transcriptModule,
  tree: treeModule,
  window: windowModule,
};

/** Readable CSS for every slide module; hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
