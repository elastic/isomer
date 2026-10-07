/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlidePipelineNode}. */
export const catalog = {
  type: 'slidePipeline',
  name: 'Pipeline',
  purpose:
    'Walk the audience through the ordered steps of one process, from what goes in to what comes out.',
  useWhen: [
    'You are explaining how one thing becomes another in two to six numbered steps, each with a sentence.',
    'You want to show who owns which run of a chain; add `spans` to bracket adjacent steps by owner.',
  ],
  avoidWhen: [
    'Two separate paths run side by side and meet at one point; use slideLanes.',
    'Participants pass messages back and forth rather than handing off once; use slideSequence.',
    'One source feeds many targets; use slideFanout.',
    'The items have no order; use slideBulletList.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
