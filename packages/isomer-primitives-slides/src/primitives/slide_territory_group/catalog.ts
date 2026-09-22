/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTerritoryGroupNode}. */
export const catalog = {
  type: 'slideTerritoryGroup',
  purpose: 'Render ownership notes paired with accent colors.',
  useWhen: [
    'A slide needs to distinguish host territory from primitive-pack territory.',
  ],
  avoidWhen: ['The ownership split is not central to the message.'],
  example,
} satisfies PrimitiveCatalogEntry;
