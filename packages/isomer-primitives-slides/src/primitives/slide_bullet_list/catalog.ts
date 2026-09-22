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
  purpose: 'Render concise slide bullets with a consistent marker.',
  useWhen: ['A slide needs a short list of implications or constraints.'],
  avoidWhen: ['The list is tabular or requires nested hierarchy.'],
  example,
} satisfies PrimitiveCatalogEntry;
