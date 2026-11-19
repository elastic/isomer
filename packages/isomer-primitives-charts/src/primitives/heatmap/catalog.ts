/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { heatmapHourly } from './examples';

/** What an agent reads to choose `heatmap`: purpose, when to use it, and an example. */
export const catalog: PrimitiveCatalogEntry = {
  type: 'heatmap',
  name: 'Heat map',
  purpose:
    'Show how a value varies across two dimensions, such as time and host, as a grid of cells colored by value bands.',
  useWhen: [
    'The point is where a value is high or low across two categories, or across time and a category.',
    'There are too many series for lines to stay readable.',
    'A Lens heat map is shown.',
  ],
  avoidWhen: [
    'Exact values matter more than the pattern: use `dataTable`.',
    'One dimension only, compared by size: use `xyChart` bars.',
    'Shares of a total: use `partitionChart`.',
  ],
  example: heatmapHourly,
};
