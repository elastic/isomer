/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideFanoutNode}. */
export const catalog = {
  type: 'slideFanout',
  purpose:
    'Show one thing going to several destinations at once, and what each one does with it.',
  useWhen: [
    'One event, request, or artifact reaches several consumers independently.',
    'Beside a slideTitle, to show what the subject feeds.',
  ],
  avoidWhen: [
    'Several things connect to each other, not just to one source; use slideGraph.',
    'The destinations split by who owns them and ownership is the point; use slideTerritoryGroup.',
    'The points share no source; use slideBulletList.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
