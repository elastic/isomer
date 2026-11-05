/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { GridNode } from '../grid';

import { metricSingleValue } from './metric';
import { unsupportedVega } from './unsupported';
import { xyTimeSeries } from './xy_chart';

/** Named `grid` examples, each of which validates in a composition. */
export const gridExamples: PrimitiveExample<GridNode>[] = [
  {
    name: 'Panels side by side',
    description:
      'Two panels in one row, with titles kept apart from their nodes, and a full-width panel below.',
    node: {
      type: 'grid',
      title: '[Logs] Web Traffic',
      panels: [
        { title: 'Requests', x: 0, y: 0, w: 12, h: 8, node: metricSingleValue },
        {
          title: 'Requests over time',
          description: 'Hourly request count.',
          x: 12,
          y: 0,
          w: 36,
          h: 8,
          node: xyTimeSeries,
        },
        {
          title: 'Visitors by OS',
          x: 0,
          y: 8,
          w: 48,
          h: 10,
          node: unsupportedVega,
        },
      ],
    },
  },
  {
    name: 'Sections',
    description:
      'Top-level panels, then an open section and a collapsed one, with panel positions relative to their section. Panels are out of reading order in the array.',
    node: {
      type: 'grid',
      panels: [
        { id: 'b', x: 24, y: 0, w: 24, h: 6, node: xyTimeSeries },
        { id: 'a', x: 0, y: 0, w: 24, h: 6, node: metricSingleValue },
      ],
      sections: [
        {
          id: 'later',
          title: 'Archive',
          collapsed: true,
          y: 20,
          panels: [{ x: 0, y: 0, w: 48, h: 6, node: unsupportedVega }],
        },
        {
          id: 'details',
          title: 'Details',
          y: 6,
          panels: [
            {
              title: 'Untitled panels hide their header',
              x: 0,
              y: 0,
              w: 16,
              h: 6,
              node: metricSingleValue,
            },
            { x: 16, y: 0, w: 32, h: 6, node: xyTimeSeries },
          ],
        },
      ],
    },
  },
];
