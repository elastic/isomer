/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideWindowChrome } from '../../theme/variants';

/** Application chrome around nested slide content. */
export interface SlideWindowNode extends PrimitiveNode {
  /** Discriminator. Always `slideWindow`. */
  type: 'slideWindow';
  /** The surround: `browser`, `terminal`, `slack`, or `chat`. */
  chrome: SlideWindowChrome;
  /** Title bar text: a URL, a command, a channel, or a thread. */
  title: string;
  /** Nodes shown inside the window. At least one. */
  body: readonly SlideContentNode[];
}
