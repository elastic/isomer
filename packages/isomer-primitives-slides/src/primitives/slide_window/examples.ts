/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bareExample as codeExample } from '../slide_code/examples';
import { example as tableExample } from '../slide_table/examples';
import { plainExample as transcriptExample } from '../slide_transcript/examples';

import type { SlideWindowNode } from './types';

/** Canonical {@link SlideWindowNode} example. */
export const example: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'slack',
  title: 'checkout-oncall',
  body: [tableExample],
};

/** A terminal. */
export const terminalExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'terminal',
  title: '~/shop — release',
  body: [codeExample],
};

/** A chat thread. */
export const chatExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'chat',
  title: 'Build assistant',
  body: [transcriptExample],
};

/** A browser tab. */
export const browserExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'browser',
  title: 'status.example.com/checkout',
  body: [tableExample],
};

/** Conformance examples for {@link SlideWindowNode}. */
export const examples: SlideWindowNode[] = [
  example,
  terminalExample,
  chatExample,
  browserExample,
];
