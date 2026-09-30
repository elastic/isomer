/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agendaModule } from './primitives/slide_agenda/styles';
import { barsModule } from './primitives/slide_bars/styles';
import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { closingModule } from './primitives/slide_closing/styles';
import { codeModule } from './primitives/slide_code/styles';
import { commandModule } from './primitives/slide_command/styles';
import { definitionsModule } from './primitives/slide_definitions/styles';
import { deltaModule } from './primitives/slide_delta/styles';
import { diffModule } from './primitives/slide_diff/styles';
import { fanoutModule } from './primitives/slide_fanout/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { lanesModule } from './primitives/slide_lanes/styles';
import { layersModule } from './primitives/slide_layers/styles';
import { listModule } from './primitives/slide_list/styles';
import { matrixModule } from './primitives/slide_matrix/styles';
import { pipelineModule } from './primitives/slide_pipeline/styles';
import { quadrantModule } from './primitives/slide_quadrant/styles';
import { quoteModule } from './primitives/slide_quote/styles';
import { sectionModule } from './primitives/slide_section/styles';
import { sequenceModule } from './primitives/slide_sequence/styles';
import { sourceModule } from './primitives/slide_source/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { statModule } from './primitives/slide_stat/styles';
import { statementModule } from './primitives/slide_statement/styles';
import { statsModule } from './primitives/slide_stats/styles';
import { tableModule } from './primitives/slide_table/styles';
import { territoryModule } from './primitives/slide_territory_group/styles';
import { titleModule } from './primitives/slide_title/styles';
import { transcriptModule } from './primitives/slide_transcript/styles';
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
  agenda: agendaModule,
  bars: barsModule,
  bullets: bulletsModule,
  closing: closingModule,
  code: codeModule,
  command: commandModule,
  definitions: definitionsModule,
  delta: deltaModule,
  diff: diffModule,
  fanout: fanoutModule,
  frame: frameModule,
  heading: headingModule,
  lanes: lanesModule,
  layers: layersModule,
  list: listModule,
  matrix: matrixModule,
  pipeline: pipelineModule,
  quadrant: quadrantModule,
  quote: quoteModule,
  section: sectionModule,
  sequence: sequenceModule,
  source: sourceModule,
  split: splitModule,
  stack: stackModule,
  stat: statModule,
  statement: statementModule,
  stats: statsModule,
  table: tableModule,
  territory: territoryModule,
  title: titleModule,
  transcript: transcriptModule,
};

/** Hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
