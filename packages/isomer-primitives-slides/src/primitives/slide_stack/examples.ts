/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as codeExample } from '../slide_code/examples';
import { plainExample as tableExample } from '../slide_table/examples';
import { plainExample as transcriptExample } from '../slide_transcript/examples';

import type { SlideStackNode } from './types';

/** Canonical {@link SlideStackNode} example. */
export const example: SlideStackNode = {
  type: 'slideStack',
  items: [tableExample, codeExample],
};

/** `tight` spacing. */
export const tightExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'tight',
  items: [transcriptExample, codeExample],
};

/** `loose` spacing. */
export const looseExample: SlideStackNode = {
  type: 'slideStack',
  spacing: 'loose',
  items: [codeExample, tableExample],
};

/** Conformance examples for {@link SlideStackNode}. */
export const examples: SlideStackNode[] = [example, tightExample, looseExample];
