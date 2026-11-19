/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { partitionPie } from './examples';

/** What an agent reads to choose `partitionChart`: purpose, when to use it, and an example. */
export const partitionChartCatalog: PrimitiveCatalogEntry = {
  type: 'partitionChart',
  name: 'Partition chart',
  purpose:
    'Show how a whole divides into parts, as a pie, donut, treemap, mosaic or waffle, with up to three nested layers.',
  useWhen: [
    'The point is each category’s share of a total.',
    'A total breaks down by one category, then by another within it.',
    'A Lens pie, donut, treemap, mosaic or waffle chart is shown.',
  ],
  avoidWhen: [
    'Values change over time, or are compared by size rather than share: use `xyChart`.',
    'There are more than a handful of slices, or values can be negative: use `xyChart` bars or `dataTable`.',
    'There is one number to report: use `metric`.',
  ],
  example: partitionPie,
};
