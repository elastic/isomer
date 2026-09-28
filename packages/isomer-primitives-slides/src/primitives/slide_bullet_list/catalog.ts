/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideBulletListNode}. */
export const catalog = {
  type: 'slideBulletList',
  purpose:
    'Give the audience a few short, unordered points, marked as neutral, done, or left out.',
  useWhen: [
    'You have two to six short points with no names or numbers to key them by.',
    'You want to show what is in scope and what is not, with `check` and `x` markers.',
  ],
  avoidWhen: [
    'Each point belongs to a term, date, or identifier; use slideList.',
    'The points are terms the audience must learn; use slideDefinitions.',
    'The order matters, as steps; use slidePipeline.',
    'The points split by who owns them; use slideTerritoryGroup.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
