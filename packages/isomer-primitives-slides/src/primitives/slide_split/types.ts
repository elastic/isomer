/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideSplitRatio } from '../../theme/variants';

/** Two-column layout with an optional width ratio. */
export interface SlideSplitNode extends PrimitiveNode {
  /** Discriminator. Always `slideSplit`. */
  type: 'slideSplit';
  /** Nodes in the left column. At least one. */
  left: readonly SlideContentNode[];
  /** Nodes in the right column. At least one. */
  right: readonly SlideContentNode[];
  /** Column widths. Defaults to `even`. */
  ratio?: SlideSplitRatio;
}
