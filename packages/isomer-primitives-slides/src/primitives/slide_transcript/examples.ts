/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTranscriptNode } from './schema';

/** Canonical {@link SlideTranscriptNode} example. */
export const example: SlideTranscriptNode = {
  type: 'slideTranscript',
  label: 'Retry loop',
  turns: [
    { role: 'user', text: 'How is checkout doing?' },
    {
      role: 'model',
      format: 'code',
      text: '{ "type": "view", "body": [{ "type": "slideTitle" }] }',
    },
    {
      role: 'host',
      format: 'code',
      text: 'body[0].title: expected string, received undefined',
    },
    { role: 'model', text: 'Retried with a title. It validates.' },
  ],
};

/** No label, prose only. */
export const plainExample: SlideTranscriptNode = {
  type: 'slideTranscript',
  turns: [
    { role: 'user', text: 'Show me the deck.' },
    { role: 'model', text: 'Here is slide one.' },
  ],
};

/** Conformance examples for {@link SlideTranscriptNode}. */
export const examples: SlideTranscriptNode[] = [example, plainExample];
