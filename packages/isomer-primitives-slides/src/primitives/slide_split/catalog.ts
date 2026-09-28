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
  purpose:
    'Set two things side by side so the reader compares them: two owners, a before and after, or an input and what it becomes.',
  useWhen: [
    'You are dividing responsibilities between two parties; list short statements under each label with a `rule` divider.',
    'One thing turns into another, like a config into behavior; use the `arrow` divider.',
    'Two slide nodes belong next to each other, such as a table beside a transcript, or a main idea with a narrow column of notes beside it; for notes, use the `aside` ratio with the `hairline` divider and a label over the notes.',
  ],
  avoidWhen: [
    'The nodes belong one above the other inside a column or window; use slideStack.',
    'There are three or more parallel items; use slideColumns.',
    'You are mapping who owns which areas across several teams; use slideTerritoryGroup.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
