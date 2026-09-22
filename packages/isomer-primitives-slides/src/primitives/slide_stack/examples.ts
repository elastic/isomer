/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as bulletExample } from '../slide_bullet_list/examples';
import { example as cardGroupExample } from '../slide_card_group/examples';
import { plainExample as flowExample } from '../slide_flow/examples';
import { example as titleExample } from '../slide_title/examples';

import type { SlideStackNode } from './types';

/** Canonical {@link SlideStackNode} example. */
export const example: SlideStackNode = {
  type: 'slideStack',
  items: [titleExample, cardGroupExample],
};

/** `tight` spacing. */
export const tightExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'tight',
  items: [flowExample, bulletExample],
};

/** `loose` spacing. */
export const looseExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'loose',
  items: [flowExample, bulletExample],
};

/** Conformance examples for {@link SlideStackNode}. */
export const examples: SlideStackNode[] = [example, tightExample, looseExample];
