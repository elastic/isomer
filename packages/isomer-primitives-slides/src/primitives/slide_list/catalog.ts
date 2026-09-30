/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideListNode}. */
export const catalog = {
  type: 'slideList',
  purpose:
    'Give the audience a handful of short facts to scan, each optionally keyed by a short term.',
  useWhen: [
    'You have up to six one-line facts, such as what changed, what shipped, or what a thing guarantees.',
    'Each fact belongs to a name, date, or identifier worth setting in its own column.',
    'The facts need a small caption above or a qualifying note below.',
  ],
  avoidWhen: [
    'The terms are new vocabulary the audience must learn; use slideDefinitions.',
    'The points are the slide’s main content and want a marker each; use slideBulletList.',
    'The items are parallel options to weigh; use slideColumns.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
