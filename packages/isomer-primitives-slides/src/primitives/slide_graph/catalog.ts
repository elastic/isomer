/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';
import { slideGraphShape } from './schema';

/** Agent-facing catalog entry for {@link SlideGraphNode}. */
export const catalog = {
  type: 'slideGraph',
  name: 'Graph',
  description: `Terms joined by arrows. ${slideGraphShape}. Node ids are unique. Every edge names a node id. No edge repeats. At most one node is emphasized.`,
  purpose:
    'Define a small vocabulary and show how its terms relate, so the audience can hold the whole model at once.',
  useWhen: [
    'You are introducing 2–6 named concepts, each with a one-line definition, and the arrows between them matter.',
    'The concepts form a chain with at most one concept feeding in from above and one from below.',
  ],
  avoidWhen: [
    'One source feeds many targets; use slideFanout.',
    'The terms have no arrows between them; use slideDefinitions.',
    'The points are dated events in order; use slideTimeline.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
