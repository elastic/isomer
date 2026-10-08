/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideStackNode}. */
export const catalog = {
  type: 'slideStack',
  name: 'Stack',
  group: 'Layout',
  description:
    'Nodes stacked vertically in a one-node slot, never a slideFrame.',
  purpose:
    'Keep several nodes together as one block, one above the next, where a slot takes a single node.',
  useWhen: [
    'A slot that takes one node, such as a slideTitle aside, needs two.',
    'Nodes need tighter or looser spacing than the column around them gives.',
  ],
  avoidWhen: [
    'The nodes sit directly in the slide body, a slideSplit pane, or a slideWindow body, which already stack them.',
    'The two blocks belong side by side; use slideSplit.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
