/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkExample as bulletExample } from '../slide_bullet_list/examples';
import { example as cardGroupExample } from '../slide_card_group/examples';
import { bareExample as codeExample } from '../slide_code/examples';
import { example as titleExample } from '../slide_title/examples';

import type { SlideSplitNode } from './types';

/** Canonical {@link SlideSplitNode} example. */
export const example: SlideSplitNode = {
  type: 'slideSplit',
  left: [titleExample],
  right: [cardGroupExample],
};

/** `wideLeft` ratio. */
export const wideLeftExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'wideLeft',
  left: [codeExample],
  right: [bulletExample],
};

/** `wideRight` ratio. */
export const wideRightExample: SlideSplitNode = {
  type: 'slideSplit',
  ratio: 'wideRight',
  left: [bulletExample],
  right: [codeExample],
};

/** Conformance examples for {@link SlideSplitNode}. */
export const examples: SlideSplitNode[] = [
  example,
  wideLeftExample,
  wideRightExample,
];
