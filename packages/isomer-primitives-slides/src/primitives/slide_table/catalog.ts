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
  purpose:
    'Let the reader compare several items across the same attributes, reading across a row or down a column.',
  useWhen: [
    'Every item has a value for the same two to six attributes, such as regions by orders, latency, and errors.',
    'The items fall into a few named groups, such as required and optional services.',
  ],
  avoidWhen: [
    'Each item is a name and one line about it; use slideList.',
    'Every cell answers yes, partly, or no, and marks would read faster than words; use slideMatrix.',
    'There are more than twelve rows; split them across two slides, each with its own slideTable.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
