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

export interface SlideSplitPane {
  label?: string;
  /** Colors the label. */
  tone?: SlideTone;
  items: readonly SlideContentNode[];
}

/** Two columns of slide nodes. */
export interface SlideSplitNode extends PrimitiveNode {
  type: 'slideSplit';
  /** Left, then right. */
  panes: readonly [SlideSplitPane, SlideSplitPane];
  /** Defaults to `even`. */
  ratio?: SlideSplitRatio;
  /** Defaults to `gap`. */
  divider?: SlideSplitDivider;
  footnote?: string;
}
