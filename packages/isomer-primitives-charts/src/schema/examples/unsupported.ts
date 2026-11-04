/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk';

import type { UnsupportedNode } from '../unsupported';

export const unsupportedVega: UnsupportedNode = {
  type: 'unsupported',
  title: '[Logs] Visitors by OS',
  reason: 'Vega visualizations cannot be shown here yet.',
  link: {
    href: 'https://kibana.example.com/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b',
    label: 'Open in Kibana',
  },
};

export const unsupportedExamples: PrimitiveExample<UnsupportedNode>[] = [
  {
    name: 'With a link',
    description: 'A panel type with no materializer, linking to its source.',
    node: unsupportedVega,
  },
  {
    name: 'Without a link',
    description: 'A failure with nowhere to send the reader.',
    node: {
      type: 'unsupported',
      title: 'Response codes over time',
      reason: 'The query timed out after 30 seconds.',
      source: {
        kind: 'kibana',
        kibanaVersion: '9.4.0',
        materializer: 'lens',
        materializerVersion: 1,
        savedObjectType: 'lens',
        savedObjectId: 'b2f4f8a0-1d2c-11ee-9f1a-0b2e5c1e7d3a',
        capturedAt: '2026-11-03T09:15:00.000Z',
      },
    },
  },
];
