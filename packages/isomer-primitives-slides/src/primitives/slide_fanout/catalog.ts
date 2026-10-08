/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideFanoutNode}. */
export const catalog = {
  type: 'slideFanout',
  name: 'Fan-out',
  group: 'Diagrams',
  purpose:
    'Show one thing going to several destinations at once, and what each one does with it.',
  useWhen: [
    'One event, request, or artifact reaches several consumers independently.',
    'Beside a slideTitle, to show what the subject feeds.',
  ],
  avoidWhen: [
    'The steps happen in order; use slidePipeline.',
    'Several things connect to each other, not just to one source; use slideGraph.',
    'The destinations split by who owns them and ownership is the point; use slideTerritoryGroup.',
    'The points share no source; use slideBulletList.',
    'The targets need more than a line each; use slideColumns.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
