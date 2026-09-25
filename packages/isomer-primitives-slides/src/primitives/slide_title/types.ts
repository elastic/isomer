/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideSize } from '../../theme/variants';

/** A dictionary-style line explaining a {@link SlideTitleNode}'s name. */
export interface SlideTitleDefinition {
  /** The word being defined, e.g. `ledger n.`. */
  term: string;
  /** The definition. */
  text: string;
}

/** The deck's opening slide, with an optional node beside it. Sits in an inverse frame. */
export interface SlideTitleNode extends PrimitiveNode {
  /** Discriminator. Always `slideTitle`. */
  type: 'slideTitle';
  /** What the subject is, above the title. */
  eyebrow?: string;
  /** The deck's subject. */
  title: string;
  /** The deck's promise in one sentence. */
  tagline?: string;
  /** A line explaining the name. */
  definition?: SlideTitleDefinition;
  /** One node drawn beside the title. */
  aside?: SlideContentNode;
  /** Display type step; absent picks the largest at which the longest word fits. */
  size?: SlideSize;
}
