/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { metricSingleValue } from './examples/metric';
import { unsupportedVega } from './examples/unsupported';
import { xyTimeSeries } from './examples/xy_chart';

/** What an agent reads to choose `metric`: purpose, when to use it, and an example. */
export const metricCatalog: PrimitiveCatalogEntry = {
  type: 'metric',
  name: 'Metric',
  purpose:
    'Show one headline number, or one tile per category, with an optional comparison, progress bar or trend.',
  useWhen: [
    'The answer is a single measured value, such as a count, rate or total.',
    'The same measure is wanted side by side for a handful of categories.',
    'A value needs context: progress toward a maximum, a change from a baseline, or its recent trend.',
  ],
  avoidWhen: [
    'The reader needs to see how values change over time or compare many categories: use `xyChart`.',
    'There are more categories than fit as tiles: use `xyChart` bars.',
  ],
  example: metricSingleValue,
};

/** What an agent reads to choose `xyChart`: purpose, when to use it, and an example. */
export const xyChartCatalog: PrimitiveCatalogEntry = {
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

/** What an agent reads to choose `grid`: purpose, when to use it, and an example. */
export const gridCatalog: PrimitiveCatalogEntry = {
  type: 'grid',
  name: 'Grid',
  purpose:
    'Place titled panels on a 48-column grid, in optional sections, as a dashboard does.',
  useWhen: [
    'Several charts or blocks belong together as one dashboard.',
    'The layout of a Kibana dashboard should be kept.',
  ],
  avoidWhen: [
    'The content reads top to bottom as one story: list the nodes in order instead.',
  ],
  example: {
    type: 'grid',
    panels: [
      { title: 'Requests', x: 0, y: 0, w: 24, h: 8, node: metricSingleValue },
      { title: 'Over time', x: 24, y: 0, w: 24, h: 8, node: xyTimeSeries },
    ],
  },
};

/** What an agent reads to choose `unsupported`: purpose, when to use it, and an example. */
export const unsupportedCatalog: PrimitiveCatalogEntry = {
  type: 'unsupported',
  name: 'Unsupported',
  purpose:
    'Say visibly that something could not be shown, why, and where to see it instead.',
  useWhen: [
    'A requested chart, panel or object cannot be materialized or rendered.',
  ],
  avoidWhen: [
    'The content can be shown, even partly: show it and record what was lost in `losses`.',
  ],
  example: unsupportedVega,
};
