/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './primitives/agenda_slide/styles';
import './primitives/closing_slide/styles';
import './primitives/quote_slide/styles';
import './primitives/section_slide/styles';
import './primitives/slide_annotated_render/styles';
import './primitives/slide_bars/styles';
import './primitives/slide_bullet_list/styles';
import './primitives/slide_code/styles';
import './primitives/slide_columns/styles';
import './primitives/slide_command/styles';
import './primitives/slide_definitions/styles';
import './primitives/slide_delta/styles';
import './primitives/slide_diff/styles';
import './primitives/slide_fanout/styles';
import './primitives/slide_frame/styles';
import './primitives/slide_graph/styles';
import './primitives/slide_heading/styles';
import './primitives/slide_lanes/styles';
import './primitives/slide_layers/styles';
import './primitives/slide_list/styles';
import './primitives/slide_matrix/styles';
import './primitives/slide_pipeline/styles';
import './primitives/slide_quadrant/styles';
import './primitives/slide_render/styles';
import './primitives/slide_render_grid/styles';
import './primitives/slide_roadmap/styles';
import './primitives/slide_sequence/styles';
import './primitives/slide_source/styles';
import './primitives/slide_split_layout/styles';
import './primitives/slide_stack_layout/styles';
import './primitives/slide_stat/styles';
import './primitives/slide_stats/styles';
import './primitives/slide_table/styles';
import './primitives/slide_territory_group/styles';
import './primitives/slide_timeline/styles';
import './primitives/slide_transcript/styles';
import './primitives/slide_tree/styles';
import './primitives/slide_window_layout/styles';
import './primitives/statement_slide/styles';
import './primitives/title_slide/styles';
import './theme/modules';

import { slideDistillery } from './theme/distillery';

/** Hosts include this beside React markup: the shared style modules and each registered primitive's. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
