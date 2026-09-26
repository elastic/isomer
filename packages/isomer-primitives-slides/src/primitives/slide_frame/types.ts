/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideFrameTone } from '../../theme/variants';

/** Fixed 16:9 root: body plus a one-line footer. Required as the document's sole body node. */
export interface SlideFrameNode extends PrimitiveNode {
  /** Discriminator. Always `slideFrame`. */
  type: 'slideFrame';
  /** Name at the left of the footer, e.g. the product. */
  brand?: string;
  /** Title of the section this slide belongs to. */
  chapter?: string;
  /** Number of the section this slide belongs to. */
  chapterNumber?: string;
  /** Whether the Isomer mark is drawn beside the footer and on a title slide. Defaults to `true`. */
  logo?: boolean;
  /** `inverse` for title, section, and closing slides. Defaults to `page`. */
  tone?: SlideFrameTone;
  /** Address at the right of the footer. */
  url?: string;
  /** Slide content, top to bottom. At least one node. */
  body: readonly SlideContentNode[];
}
