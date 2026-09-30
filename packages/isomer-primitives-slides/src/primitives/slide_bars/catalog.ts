/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideBarsNode}. */
export const catalog = {
  type: 'slideBars',
  purpose:
    'Let the audience compare the size of several amounts of the same kind, and see which one stands out.',
  useWhen: [
    'Two to six amounts in one unit should be ranked or compared by size, such as orders per site.',
    'One item is the point of the slide and should stand out from the rest; set `highlight` on it.',
  ],
  avoidWhen: [
    'There are two to four numbers to remember rather than compare; use slideStats.',
    'One number changed from before to after; use slideDelta.',
    'Each item has several attributes, not one amount; use slideTable.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
