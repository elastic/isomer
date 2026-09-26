/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideRoadmapNode}. */
export const catalog = {
  type: 'slideRoadmap',
  purpose:
    'Show what is done, what comes next, and what comes after, so the audience knows where the work stands.',
  useWhen: [
    'You are presenting plans by horizon, such as now, next, and later, each with a few named pieces of work.',
    'The audience should see which stage is under way while the stages after it stay in view.',
  ],
  avoidWhen: [
    'The points are dated events that already happened; use slideTimeline.',
    'The columns are options to weigh, not stages in time; use slideColumns.',
    'The items are steps of one process that hand off to each other; use slidePipeline.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
