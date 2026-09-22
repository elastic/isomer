/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideSplitNode}. */
export const catalog = {
  type: 'slideSplit',
  purpose: 'Divide a slide into two columns with an optional width ratio.',
  useWhen: ['A slide needs to show two concepts side by side.'],
  avoidWhen: ['A single column stack would be clearer.'],
  example,
} satisfies PrimitiveCatalogEntry;
