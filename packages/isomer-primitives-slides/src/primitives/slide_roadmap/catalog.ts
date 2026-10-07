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
  name: 'Roadmap',
  purpose:
    'Show what is done, what comes next, and what comes after, so the audience knows where the work stands.',
  useWhen: [
    'You are presenting plans by horizon, such as now, next, and later, each with a few named pieces of work.',
    'The audience should see which stage is under way while the stages after it stay in view.',
  ],
  avoidWhen: [
    'The points are dated events that already happened; use slideTimeline.',
    'The columns split work by who owns it, not by when; use slideTerritoryGroup.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
