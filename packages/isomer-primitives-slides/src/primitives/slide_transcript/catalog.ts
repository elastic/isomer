/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTranscriptNode}. */
export const catalog = {
  type: 'slideTranscript',
  name: 'Transcript',
  purpose:
    'Let the reader follow a short exchange between a person, a model, and the program hosting it, turn by turn.',
  useWhen: [
    'You are replaying what an assistant was asked, what it answered, and how the host responded.',
    'The slide shows a retry: a bad answer, the error it got back, and the fixed answer.',
  ],
  avoidWhen: [
    'Only one side speaks, as a snippet or an output; use slideCode.',
    'The point is where the conversation happens, such as a chat app or a channel; wrap it in a slideWindow.',
    'The exchange needs more than four turns; split it across two slides, each with its own slideTranscript.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
