/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { metricSingleValue } from '../metric/examples';
import { xyTimeSeries } from '../xy_chart/examples';

/** What an agent reads to choose `grid`: purpose, when to use it, and an example. */
export const catalog: PrimitiveCatalogEntry = {
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
