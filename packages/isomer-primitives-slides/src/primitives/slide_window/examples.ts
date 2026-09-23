/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { example as codeExample } from '../slide_code/examples';
import { plainExample as transcriptExample } from '../slide_transcript/examples';

import type { SlideWindowNode } from './types';

/** Canonical {@link SlideWindowNode} example. */
export const example: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'terminal',
  title: 'isomer render --surface text',
  body: [codeExample],
};

/** A chat thread. */
export const chatExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'chat',
  title: 'Agent',
  body: [transcriptExample],
};

/** A browser tab. */
export const browserExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'browser',
  title: 'elastic.github.io/isomer',
  body: [codeExample],
};

/** A Slack channel. */
export const slackExample: SlideWindowNode = {
  type: 'slideWindow',
  chrome: 'slack',
  title: 'alerts',
  body: [transcriptExample],
};

/** Conformance examples for {@link SlideWindowNode}. */
export const examples: SlideWindowNode[] = [
  example,
  chatExample,
  browserExample,
  slackExample,
];
