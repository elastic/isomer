/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { dataTableTopHosts } from './examples/data_table';
import { gaugeSemiCircle } from './examples/gauge';
import { heatmapHourly } from './examples/heatmap';
import { metricSingleValue } from './examples/metric';
import { partitionPie } from './examples/partition_chart';
import { tagCloudServices } from './examples/tag_cloud';
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

/** What an agent reads to choose `dataTable`: purpose, when to use it, and an example. */
export const dataTableCatalog: PrimitiveCatalogEntry = {
  type: 'dataTable',
  name: 'Data table',
  purpose:
    'List rows of values to read and compare exactly, with formats, colored cells, bars, sorting, paging and a summary row.',
  useWhen: [
    'The reader needs exact values rather than a shape.',
    'Several measures are wanted side by side for each of many categories.',
    'A Lens data table or a Discover session is shown.',
  ],
  avoidWhen: [
    'The point is a trend or a comparison of sizes: use `xyChart`.',
    'There is one number to report: use `metric`.',
  ],
  example: dataTableTopHosts,
};

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

/** What an agent reads to choose `heatmap`: purpose, when to use it, and an example. */
export const heatmapCatalog: PrimitiveCatalogEntry = {
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

/** What an agent reads to choose `gauge`: purpose, when to use it, and an example. */
export const gaugeCatalog: PrimitiveCatalogEntry = {
  type: 'gauge',
  name: 'Gauge',
  purpose:
    'Show one value against a scale from a minimum to a maximum, as a bullet or a dial, with colored ranges and an optional goal.',
  useWhen: [
    'The point is where one value sits within known bounds, such as utilization against capacity.',
    'Ranges of the scale mean something, such as healthy, warning and critical.',
    'A Lens gauge is shown.',
  ],
  avoidWhen: [
    'The value has no meaningful bounds: use `metric`.',
    'Several values are compared: use `xyChart` bars or `metric` tiles.',
    'The value changes over time: use `xyChart`.',
  ],
  example: gaugeSemiCircle,
};

/** What an agent reads to choose `tagCloud`: purpose, when to use it, and an example. */
export const tagCloudCatalog: PrimitiveCatalogEntry = {
  type: 'tagCloud',
  name: 'Tag cloud',
  purpose:
    'Show which terms are most frequent or largest at a glance, as words sized by value.',
  useWhen: [
    'The point is which of many terms stand out, not their exact values.',
    'A Lens tag cloud is shown.',
  ],
  avoidWhen: [
    'Values are compared exactly, or ranked: use `xyChart` bars or `dataTable`.',
    'Shares of a total: use `partitionChart`.',
    'There are only a few terms: use `xyChart` bars.',
  ],
  example: tagCloudServices,
};
