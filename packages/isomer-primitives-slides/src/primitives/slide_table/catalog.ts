/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTableNode}. */
export const catalog = {
  type: 'slideTable',
  purpose: 'Render a headed grid of short text cells.',
  useWhen: [
    'A slide compares several items across the same two to six attributes.',
  ],
  avoidWhen: [
    'Cells need more than a short phrase; use a card group.',
    'There are more than twelve rows.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
