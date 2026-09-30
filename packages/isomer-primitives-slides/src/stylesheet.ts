/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agendaModule } from './primitives/slide_agenda/styles';
import { bulletsModule } from './primitives/slide_bullet_list/styles';
import { closingModule } from './primitives/slide_closing/styles';
import { codeModule } from './primitives/slide_code/styles';
import { commandModule } from './primitives/slide_command/styles';
import { definitionsModule } from './primitives/slide_definitions/styles';
import { diffModule } from './primitives/slide_diff/styles';
import { fanoutModule } from './primitives/slide_fanout/styles';
import { frameModule } from './primitives/slide_frame/styles';
import { headingModule } from './primitives/slide_heading/styles';
import { listModule } from './primitives/slide_list/styles';
import { quoteModule } from './primitives/slide_quote/styles';
import { sectionModule } from './primitives/slide_section/styles';
import { sourceModule } from './primitives/slide_source/styles';
import { splitModule } from './primitives/slide_split/styles';
import { stackModule } from './primitives/slide_stack/styles';
import { statementModule } from './primitives/slide_statement/styles';
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
  agenda: agendaModule,
  bullets: bulletsModule,
  closing: closingModule,
  code: codeModule,
  command: commandModule,
  definitions: definitionsModule,
  diff: diffModule,
  fanout: fanoutModule,
  frame: frameModule,
  heading: headingModule,
  list: listModule,
  quote: quoteModule,
  section: sectionModule,
  source: sourceModule,
  split: splitModule,
  stack: stackModule,
  statement: statementModule,
  territory: territoryModule,
  title: titleModule,
  transcript: transcriptModule,
};

/** Hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
