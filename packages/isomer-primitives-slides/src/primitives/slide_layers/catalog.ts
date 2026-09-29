/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideLayersNode}. */
export const catalog = {
  type: 'slideLayers',
  purpose:
    'Show how a system stacks, layer on layer, and who owns each layer, so the audience knows where a concern lives.',
  useWhen: [
    'The parts sit on top of one another in a fixed order, and each rests on the one below.',
    'Each layer has a clear owner, and where ownership changes is part of the point.',
  ],
  avoidWhen: [
    'The owners sit side by side with no order between them; use slideTerritoryGroup.',
    'The parts run in sequence rather than stack; use slidePipeline.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
