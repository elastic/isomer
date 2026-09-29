/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideSize } from '../../theme/variants';

/** A dictionary-style line explaining the title's name. */
export interface SlideTitleDefinition {
  /** e.g. `ledger n.` */
  term: string;
  text: string;
}

/** The deck's opening slide, with an optional node beside it. Sits in an inverse frame. */
export interface SlideTitleNode extends PrimitiveNode {
  type: 'slideTitle';
  eyebrow?: string;
  title: string;
  tagline?: string;
  definition?: SlideTitleDefinition;
  aside?: SlideContentNode;
  /** Absent picks the largest step at which the longest word fits. */
  size?: SlideSize;
}
