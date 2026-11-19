/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { xyTimeSeries } from './examples';

/** What an agent reads to choose `xyChart`: purpose, when to use it, and an example. */
export const catalog: PrimitiveCatalogEntry = {
  type: 'xyChart',
  name: 'XY chart',
  purpose:
    'Plot values against a shared x axis as lines, areas or bars, with reference lines and annotations.',
  useWhen: [
    'The reader needs a trend over time.',
    'Categories are compared by size, or broken down into parts.',
    'Two measures on different scales share an x axis.',
  ],
  avoidWhen: [
    'There is one number to report: use `metric`.',
    'The values are a list to read rather than a shape to see.',
  ],
  example: xyTimeSeries,
};
