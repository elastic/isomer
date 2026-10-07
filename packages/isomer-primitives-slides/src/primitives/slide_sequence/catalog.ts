/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideSequenceNode}. */
export const catalog = {
  type: 'slideSequence',
  name: 'Sequence',
  purpose:
    'Show who says what to whom, in order, so the audience can follow a conversation between systems or people step by step.',
  useWhen: [
    'A request passes back and forth between three to five participants, and the order of the messages is the point.',
    'You want to show a failure and its recovery, such as a rejected call and the retry that follows.',
  ],
  avoidWhen: [
    'Each step hands off to the next and nothing comes back; use slidePipeline.',
    'Two routes converge on one step; use slideLanes.',
    'The messages are whole turns of text between a user, a model, and a host; use slideTranscript.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
