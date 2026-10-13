/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkExample as bulletListExample } from '../slide_bullet_list/examples';
import { bareExample as codeExample } from '../slide_code/examples';

import type { SlideStackLayoutNode } from './types';

/** Canonical {@link SlideStackLayoutNode} example. */
export const example: SlideStackLayoutNode = {
  type: 'slideStackLayout',
  items: [bulletListExample, codeExample],
};

export const tightExample: SlideStackLayoutNode = {
  type: 'slideStackLayout',
  spacing: 'tight',
  items: [bulletListExample, codeExample],
};

export const looseExample: SlideStackLayoutNode = {
  type: 'slideStackLayout',
  spacing: 'loose',
  items: [bulletListExample, codeExample],
};

/** Conformance examples for {@link SlideStackLayoutNode}. */
export const examples: SlideStackLayoutNode[] = [
  example,
  tightExample,
  looseExample,
];
