/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideDeltaNode}. */
export const catalog = {
  type: 'slideDelta',
  purpose:
    'Show how far one number moved between two points, and what that change means.',
  useWhen: [
    'The slide’s point is an improvement or a regression: one measure, before and after.',
    'The size of the change matters as much as either number; state it in `change`.',
  ],
  avoidWhen: [
    'The numbers measure different things rather than one thing twice; use slideStats.',
    'More than two points in time matter; use slideBars for the amounts.',
    'There is one number and no before; use slideStat.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
