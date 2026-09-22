/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as cardGroupExample } from '../slide_card_group/examples';
import {
  example as titleExample,
  jumboExample as jumboTitleExample,
} from '../slide_title/examples';

import type { SlideFrameNode } from './types';

/** Canonical {@link SlideFrameNode} example. */
export const example: SlideFrameNode = {
  type: 'slideFrame',
  brand: 'Isomer',
  chapter: '01 · Reference pack',
  footer: 'Elastic',
  body: [titleExample, cardGroupExample],
};

/** `title` layout with a separate chapter number and no brand. */
export const titleLayoutExample: SlideFrameNode = {
  type: 'slideFrame',
  chapter: 'Reference pack',
  chapterNumber: '01',
  footer: 'Elastic',
  layout: 'title',
  body: [jumboTitleExample],
};

/** Conformance examples for {@link SlideFrameNode}. */
export const examples: SlideFrameNode[] = [example, titleLayoutExample];
