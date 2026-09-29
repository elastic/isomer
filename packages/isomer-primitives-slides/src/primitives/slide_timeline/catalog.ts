/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTimelineNode}. */
export const catalog = {
  type: 'slideTimeline',
  purpose:
    'Show how a need or situation changed over dated points, leading up to the one that matters now.',
  useWhen: [
    'The argument is a history: each point in time asked for or tried something, and the latest is where the story lands.',
    'You have 3–5 dated moments that each deserve a quoted ask and a one-line outcome.',
  ],
  avoidWhen: [
    'The points are plans ahead, grouped by horizon rather than dated events; use slideRoadmap.',
    'The items have no order and no dates; use slideBulletList.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
