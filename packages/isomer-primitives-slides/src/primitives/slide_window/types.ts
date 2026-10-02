/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideWindowChrome } from '../../theme/variants';

/** Slide content in one app's title bar. */
export interface SlideWindowNode extends PrimitiveNode {
  type: 'slideWindow';
  /** Only the title bar changes. */
  chrome: SlideWindowChrome;
  /** For `slack`, the channel name without `#`. */
  title: string;
  /** Never another window. */
  body: readonly SlideContentNode[];
}
