/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideCycleNode}. */
export const catalog = {
  type: 'slideCycle',
  purpose: 'Render a closed loop of three to six steps around a ring.',
  useWhen: [
    'A process repeats: a retry loop, a feedback cycle, a release train.',
  ],
  avoidWhen: [
    'The process has an end; use a flow.',
    'A step branches or needs more than a short label.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
