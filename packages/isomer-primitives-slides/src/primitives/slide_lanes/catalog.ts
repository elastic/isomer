/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideLanesNode}. */
export const catalog = {
  type: 'slideLanes',
  name: 'Lanes',
  description: 'Exactly two lanes that converge on join.',
  purpose:
    'Contrast two different routes to the same destination, so the audience sees where they differ and where they meet.',
  useWhen: [
    'Two sources or workflows take different steps and end at one shared step.',
    'You want a note under the diagram on how each path differs.',
  ],
  avoidWhen: [
    'There is only one path; use slidePipeline.',
    'One source feeds many targets instead of two feeding one; use slideFanout.',
    'The two sides are opposing claims rather than routes; use slideSplit.',
    'Participants send messages back and forth rather than following a path; use slideSequence.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
