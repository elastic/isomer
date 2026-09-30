/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hand-maintained body-node union. Update when a primitive is added or removed;
// `registry.test.ts` fails if this and `registry.ts` drift.
//
// The cycle with the container `types.ts` files (they import {@link SlideContentNode},
// this imports their node types) is type-only and intentional. Do not break it by
// deriving the union from the registry: that closes it at the value level (TS7022).

import type { SlideAgendaNode } from './primitives/slide_agenda';
import type { SlideBulletListNode } from './primitives/slide_bullet_list';
import type { SlideClosingNode } from './primitives/slide_closing';
import type { SlideCodeNode } from './primitives/slide_code';
import type { SlideCommandNode } from './primitives/slide_command';
import type { SlideDefinitionsNode } from './primitives/slide_definitions';
import type { SlideDiffNode } from './primitives/slide_diff';
import type { SlideFanoutNode } from './primitives/slide_fanout';
import type { SlideFrameNode } from './primitives/slide_frame';
import type { SlideHeadingNode } from './primitives/slide_heading';
import type { SlideListNode } from './primitives/slide_list';
import type { SlideMatrixNode } from './primitives/slide_matrix';
import type { SlideQuadrantNode } from './primitives/slide_quadrant';
import type { SlideQuoteNode } from './primitives/slide_quote';
import type { SlideSectionNode } from './primitives/slide_section';
import type { SlideSourceNode } from './primitives/slide_source';
import type { SlideSplitNode } from './primitives/slide_split';
import type { SlideStackNode } from './primitives/slide_stack';
import type { SlideStatementNode } from './primitives/slide_statement';
import type { SlideTableNode } from './primitives/slide_table';
import type { SlideTerritoryGroupNode } from './primitives/slide_territory_group';
import type { SlideTitleNode } from './primitives/slide_title';
import type { SlideTranscriptNode } from './primitives/slide_transcript';

/** Discriminated union of every node type this pack defines. */
export type BodyNode =
  | SlideAgendaNode
  | SlideBulletListNode
  | SlideClosingNode
  | SlideCodeNode
  | SlideCommandNode
  | SlideDefinitionsNode
  | SlideDiffNode
  | SlideFanoutNode
  | SlideFrameNode
  | SlideHeadingNode
  | SlideListNode
  | SlideMatrixNode
  | SlideQuadrantNode
  | SlideQuoteNode
  | SlideSectionNode
  | SlideSourceNode
  | SlideSplitNode
  | SlideStackNode
  | SlideStatementNode
  | SlideTableNode
  | SlideTerritoryGroupNode
  | SlideTitleNode
  | SlideTranscriptNode;

/** A {@link BodyNode} that may nest inside a {@link SlideFrameNode}; frames cannot nest. */
export type SlideContentNode = Exclude<BodyNode, SlideFrameNode>;
