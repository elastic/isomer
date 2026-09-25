/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideWindowChrome } from '../../theme/variants';

/** Nested slide content in one app's title bar. */
export interface SlideWindowNode extends PrimitiveNode {
  /** Discriminator. Always `slideWindow`. */
  type: 'slideWindow';
  /** The app the content appears in; only the title bar changes. */
  chrome: SlideWindowChrome;
  /** Title bar text; for `slack`, the channel name without `#`. */
  title: string;
  /** Nodes shown inside the window. At least one; never another window. */
  body: readonly SlideContentNode[];
}
