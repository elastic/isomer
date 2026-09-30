/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideTerritoryGroupNode}. */
export const catalog = {
  type: 'slideTerritoryGroup',
  purpose:
    'Show who owns what, so the audience knows which side is responsible for each part.',
  useWhen: [
    'Responsibility splits between your side and another (a host, partner, or vendor), and color should key it.',
    'Each owner fits a short title and one or two sentences.',
  ],
  avoidWhen: [
    'Two sides each hold a list of items, with a divider between; use slideSplit.',
    'Ownership is not the point of the slide; use slideBulletList.',
    'The owned parts stack in order, each resting on the one below; use slideLayers.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
