/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideStackSpacing } from '../../theme/variants';

/** Vertical stack of slide primitives with controlled spacing. */
export interface SlideStackNode extends PrimitiveNode {
  /** Discriminator. Always `slideStack`. */
  type: 'slideStack';
  /** Gap between items. Defaults to `normal`. */
  spacing?: SlideStackSpacing;
  /** Nodes from top to bottom. At least one. */
  items: readonly SlideContentNode[];
}
