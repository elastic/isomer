/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agendaModule } from './primitives/agenda_slide/styles';
import { closingModule } from './primitives/closing_slide/styles';
import { quoteModule } from './primitives/quote_slide/styles';
import { sectionModule } from './primitives/section_slide/styles';
import { annotatedRenderModule } from './primitives/slide_annotated_render/styles';
import { barsModule } from './primitives/slide_bars/styles';
import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { codeModule } from './primitives/slide_code/styles';
import { columnsModule } from './primitives/slide_columns/styles';
import { commandModule } from './primitives/slide_command/styles';
import { definitionsModule } from './primitives/slide_definitions/styles';
import { deltaModule } from './primitives/slide_delta/styles';
import { diffModule } from './primitives/slide_diff/styles';
import { fanoutModule } from './primitives/slide_fanout/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { graphModule } from './primitives/slide_graph/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { lanesModule } from './primitives/slide_lanes/styles';
import { layersModule } from './primitives/slide_layers/styles';
import { listModule } from './primitives/slide_list/styles';
import { matrixModule } from './primitives/slide_matrix/styles';
import { pipelineModule } from './primitives/slide_pipeline/styles';
import { quadrantModule } from './primitives/slide_quadrant/styles';
import { renderModule } from './primitives/slide_render/styles';
import { renderGridModule } from './primitives/slide_render_grid/styles';
import { roadmapModule } from './primitives/slide_roadmap/styles';
import { sequenceModule } from './primitives/slide_sequence/styles';
import { sourceModule } from './primitives/slide_source/styles';
import { splitModule } from './primitives/slide_split_layout/styles';
import { stackModule } from './primitives/slide_stack_layout/styles';
import { statModule } from './primitives/slide_stat/styles';
import { statsModule } from './primitives/slide_stats/styles';
import { tableModule } from './primitives/slide_table/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { timelineModule } from './primitives/slide_timeline/styles';
import { transcriptModule } from './primitives/slide_transcript/styles';
import { treeModule } from './primitives/slide_tree/styles';
import { windowModule } from './primitives/slide_window_layout/styles';
import { statementModule } from './primitives/statement_slide/styles';
import { titleModule } from './primitives/title_slide/styles';
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

/** Referenced by value so a bundle of `slideStylesheet` alone keeps every module. */
export const slideStyleModules = [
  deckRootModule,
  layoutModule,
  tonesModule,
  labelModule,
  connectorModule,
  marksModule,
  placeholderModule,
  agendaModule,
  closingModule,
  quoteModule,
  sectionModule,
  annotatedRenderModule,
  barsModule,
  bulletsModule,
  codeModule,
  columnsModule,
  commandModule,
  definitionsModule,
  deltaModule,
  diffModule,
  fanoutModule,
  frameModule,
  graphModule,
  headingModule,
  lanesModule,
  layersModule,
  listModule,
  matrixModule,
  pipelineModule,
  quadrantModule,
  renderModule,
  renderGridModule,
  roadmapModule,
  sequenceModule,
  sourceModule,
  splitModule,
  stackModule,
  statModule,
  statsModule,
  tableModule,
  territoryModule,
  timelineModule,
  transcriptModule,
  treeModule,
  windowModule,
  statementModule,
  titleModule,
];

/** Hosts include this beside React markup: the shared style modules and each primitive's. */
export const slideStylesheet = (): string => {
  const collector = slideDistillery.stylesheetCollector();
  slideStyleModules.forEach((module) => collector.useAllEntries(module));
  return slideDistillery.renderStyles(collector);
};
