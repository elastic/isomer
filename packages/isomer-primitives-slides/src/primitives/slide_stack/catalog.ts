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
  purpose:
    'Keep several nodes together as one block, one above the next, where a slot takes a single node.',
  useWhen: [
    'One column of a slideSplit needs two nodes, such as a table over a code panel.',
    'A slideWindow body needs its nodes spaced tighter or looser than the default.',
  ],
  avoidWhen: [
    'The nodes sit directly in the slide body, which already stacks them; list them in the slideFrame body.',
    'The two blocks belong side by side; use slideSplit.',
    'You are grouping territories or owners into labeled regions; use slideTerritoryGroup.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
