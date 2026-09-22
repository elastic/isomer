/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideStackNode}. */
export const catalog = {
  type: 'slideStack',
  purpose: 'Stack slide primitives vertically with controlled spacing.',
  useWhen: ['A slide needs two or more vertically arranged content blocks.'],
  avoidWhen: ['A split layout or a single block would be clearer.'],
  example,
} satisfies PrimitiveCatalogEntry;
