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
  purpose:
    'Render a short conversation between a user, a model, and the host application.',
  useWhen: [
    'A slide replays an agent exchange, a prompt and its answer, or a retry.',
  ],
  avoidWhen: [
    'The exchange needs more than eight turns.',
    'Only one side speaks; use a code block or a bullet list.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
