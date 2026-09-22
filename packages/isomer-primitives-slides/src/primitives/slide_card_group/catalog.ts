/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCardGroupNode}. */
export const catalog = {
  type: 'slideCardGroup',
  purpose: 'Render a repeated set of presentation cards.',
  useWhen: ['A slide compares roles, choices, or repeated concepts.'],
  avoidWhen: ['A semantic table or description list would be clearer.'],
  example,
} satisfies PrimitiveCatalogEntry;
