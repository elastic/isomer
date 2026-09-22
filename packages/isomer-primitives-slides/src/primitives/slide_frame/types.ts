/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideFrameLayout } from '../../theme/variants';

/** Fixed 16:9 root: topbar, body, and footer. Required as the document's sole body node. */
export interface SlideFrameNode extends PrimitiveNode {
  /** Discriminator. Always `slideFrame`. */
  type: 'slideFrame';
  /** Product or pack name shown beside the mark. */
  brand?: string;
  /** Section title in the topbar. */
  chapter: string;
  /** Optional index shown before {@link SlideFrameNode.chapter}. */
  chapterNumber?: string;
  /** Right-side footer copy. */
  footer: string;
  /** `title` centers the body. Defaults to `content`. */
  layout?: SlideFrameLayout;
  /** Nested slide content. At least one node. */
  body: readonly SlideContentNode[];
}
