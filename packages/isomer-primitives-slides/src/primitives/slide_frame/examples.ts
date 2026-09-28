/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as headingExample } from '../slide_heading/examples';

import type { SlideFrameNode } from './types';

/** Canonical {@link SlideFrameNode} example: a content slide. */
export const example: SlideFrameNode = {
  type: 'slideFrame',
  brand: 'Ledger',
  section: 'Settlement',
  sectionNumber: '02',
  url: 'https://example.com/ledger',
  body: [headingExample],
};

/** Conformance examples for {@link SlideFrameNode}. */
export const examples: SlideFrameNode[] = [example];
