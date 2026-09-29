/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkExample as bulletListExample } from '../slide_bullet_list/examples';
import { bareExample as codeExample } from '../slide_code/examples';

import type { SlideStackNode } from './types';

/** Canonical {@link SlideStackNode} example. */
export const example: SlideStackNode = {
  type: 'slideStack',
  items: [bulletListExample, codeExample],
};

export const tightExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'tight',
  items: [bulletListExample, codeExample],
};

export const looseExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'loose',
  items: [bulletListExample, codeExample],
};

/** Conformance examples for {@link SlideStackNode}. */
export const examples: SlideStackNode[] = [example, tightExample, looseExample];
