/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type {
  SlideSplitDivider,
  SlideSplitRatio,
  SlideTone,
} from '../../theme/variants';

/** One column of a {@link SlideSplitNode}. */
export interface SlideSplitSide {
  /** Short uppercase label over the column. */
  label?: string;
  /** Colors the label. */
  tone?: SlideTone;
  /** One to six items: a string is a bold statement, a node renders as itself. */
  items: readonly (string | SlideContentNode)[];
}

/** Two columns of statements or slide nodes. */
export interface SlideSplitNode extends PrimitiveNode {
  /** Discriminator. Always `slideSplit`. */
  type: 'slideSplit';
  left: SlideSplitSide;
  right: SlideSplitSide;
  /** Column widths. Defaults to `even`. */
  ratio?: SlideSplitRatio;
  /** What sits between the columns. Defaults to `gap`. */
  divider?: SlideSplitDivider;
  /** One sentence under both columns. */
  footnote?: string;
}
