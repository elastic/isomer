/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../../body_node';
import type { SlideFrameTone } from '../../theme/variants';

/** One line under the slide: deck name, section, and address. */
export interface SlideFooter {
  brand?: string;
  section?: string;
  sectionNumber?: string;
  url?: string;
}

/** Fixed 16:9 root: body plus a one-line footer. The document's sole body node. */
export interface SlideFrameNode extends PrimitiveNode {
  type: 'slideFrame';
  footer?: SlideFooter;
  /** Defaults to `true`. */
  logo?: boolean;
  /** Defaults to `page`. */
  tone?: SlideFrameTone;
  body: readonly SlideContentNode[];
}
