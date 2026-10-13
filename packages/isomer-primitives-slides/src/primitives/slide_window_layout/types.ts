/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideWindowChrome } from '../../theme/variants';

/** A content primitive other than a window. A window nested further down still fails validation. */
export type SlideWindowChild = Exclude<
  SlideContentNode,
  { type: 'slideWindowLayout' }
>;

/** Slide content in one app's title bar. */
export interface SlideWindowLayoutNode extends PrimitiveNode {
  type: 'slideWindowLayout';
  /** Only the title bar changes. */
  chrome: SlideWindowChrome;
  /** For `slack`, the channel name without `#`. */
  title: string;
  /** Never another window, and never a frame. */
  body: readonly SlideWindowChild[];
}
