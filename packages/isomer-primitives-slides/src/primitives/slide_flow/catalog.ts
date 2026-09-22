/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideFlowNode}. */
export const catalog = {
  type: 'slideFlow',
  purpose: 'Render a horizontal sequence of labeled boxes connected by lines.',
  useWhen: [
    'A slide needs to show a data or request flow with named boundaries.',
  ],
  avoidWhen: ['The flow has more than eight nodes or requires branching.'],
  example,
} satisfies PrimitiveCatalogEntry;
