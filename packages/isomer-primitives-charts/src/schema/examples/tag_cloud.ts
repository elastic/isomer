/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample } from '@elastic/isomer-sdk/schema';

import type { ChartColumn } from '../data';
import type { TagCloudNode } from '../tag_cloud';

import { NUMBER } from './shared';

const COUNT: ChartColumn = {
  id: 'count',
  label: 'Count of records',
  type: 'number',
  role: 'metric',
  format: NUMBER,
};

const dimension = (id: string, label: string): ChartColumn => ({
  id,
  label,
  type: 'string',
  role: 'dimension',
});

/** The smallest `tagCloud`: services by log volume. The catalog's example. */
export const tagCloudServices: TagCloudNode = {
  type: 'tagCloud',
  title: 'Log volume by service',
  data: {
    columns: [dimension('service', 'service.name'), COUNT],
    rows: [
      ['checkout', 9_120],
      ['search', 6_310],
      ['cart', 4_870],
      ['auth', 3_220],
      ['payments', 2_410],
      ['inventory', 1_650],
      ['shipping', 980],
      ['recommendations', 610],
      ['email', 240],
      ['ads', 90],
    ],
  },
  tags: { column: 'service' },
  metric: { column: 'count' },
};

/** Named `tagCloud` examples covering the corpus edge cases, each valid in a composition. */
export const tagCloudExamples: PrimitiveExample<TagCloudNode>[] = [
  {
    name: 'Services by volume',
    description:
      'Ten words in the default palette, sized linearly from the quietest service to the busiest, with the label under the cloud.',
    node: tagCloudServices,
  },
  {
    name: 'Right-angled with stated colors, Other and missing buckets',
    description:
      'Words turned a quarter turn by their text, colors for both schemes by tag, the Other bucket and a missing (null) bucket, on a square-root scale with smaller fonts. Words that do not fit, as two long ones here, are left out, as Lens leaves them.',
    node: {
      type: 'tagCloud',
      title: 'Errors by type',
      data: {
        columns: [dimension('error', 'error.type'), COUNT],
        rows: [
          ['TimeoutError', 812],
          ['ConnectionReset', 431],
          ['NullPointerException', 290],
          ['Other', 620],
          [null, 75],
          ['OutOfMemoryError', 44],
        ],
      },
      tags: { column: 'error' },
      metric: { column: 'count' },
      scale: 'squareRoot',
      orientation: 'rightAngled',
      fontSize: { min: 14, max: 40 },
      colors: {
        byKey: {
          TimeoutError: { light: '#C61E25', dark: '#F6726A' },
          Other: { light: '#5A6D8C', dark: '#98A8C3' },
          '\\null': { light: '#98A8C3', dark: '#5A6D8C' },
        },
      },
    },
  },
  {
    name: 'Many angles on a log scale',
    description:
      'Words at up to 12 angles, sized on a base-2 logarithmic scale over values from 3 to 120,000, with smaller fonts and no label.',
    node: {
      type: 'tagCloud',
      title: 'Search terms',
      data: {
        columns: [dimension('term', 'search.term'), COUNT],
        rows: [
          ['shoes', 120_000],
          ['jacket', 48_000],
          ['socks', 9_600],
          ['scarf', 2_100],
          ['gloves', 640],
          ['umbrella', 88],
          ['raincoat', 12],
          ['galoshes', 3],
        ],
      },
      tags: { column: 'term' },
      metric: { column: 'count' },
      scale: 'log',
      orientation: 'multiple',
      fontSize: { min: 12, max: 48 },
      showLabel: false,
    },
  },
  {
    name: 'Numbers as tags, with missing values',
    description:
      'Tags from a number column in its format, with missing values drawn at the smallest size.',
    node: {
      type: 'tagCloud',
      title: 'Responses by status code',
      data: {
        columns: [
          {
            id: 'status',
            label: 'http.response.status_code',
            type: 'number',
            role: 'dimension',
            format: { kind: 'number', useGrouping: false },
          },
          COUNT,
        ],
        rows: [
          [200, 8_412],
          [404, 1_204],
          [500, null],
          [301, 655],
          [503, null],
        ],
      },
      tags: { column: 'status' },
      metric: { column: 'count' },
    },
  },
  {
    name: 'One tag',
    description: 'A single row: the word takes the largest size.',
    node: {
      type: 'tagCloud',
      title: 'Top host',
      data: {
        columns: [dimension('host', 'host.name'), COUNT],
        rows: [['web-01', 1]],
      },
      tags: { column: 'host' },
      metric: { column: 'count' },
    },
  },
  {
    name: 'No rows',
    description: 'No data: the chart says there are no results.',
    node: {
      type: 'tagCloud',
      title: 'Tags by count',
      data: {
        columns: [dimension('tag', 'tags'), COUNT],
        rows: [],
      },
      tags: { column: 'tag' },
      metric: { column: 'count' },
    },
  },
  {
    name: 'Selectable, pre-rendered and with provenance',
    description:
      'Words a reader can select, names pre-rendered by the host, an emphasized word with a note, a link, provenance and a recorded loss.',
    node: {
      type: 'tagCloud',
      title: 'Alerts by rule',
      description: 'Alerts fired in the last 24 hours, by rule.',
      data: {
        columns: [
          {
            ...dimension('rule', 'kibana.alert.rule.uuid'),
            source: { field: 'kibana.alert.rule.uuid' },
          },
          COUNT,
        ],
        rows: [
          ['a1', 142],
          ['b2', 87],
          ['c3', 51],
          ['d4', 23],
        ],
        display: {
          rule: ['High CPU', 'Disk almost full', 'Error spike', 'Cert expiry'],
        },
      },
      tags: { column: 'rule' },
      metric: { column: 'count' },
      interactions: {
        select: ['tag'],
        link: {
          label: 'Open in Kibana',
          href: 'https://kibana.example.com/app/observability/alerts',
        },
      },
      emphasis: [{ rows: [1], note: 'Disk alerts doubled since yesterday.' }],
      source: {
        host: 'kibana',
        hostVersion: '9.3.0',
        capturedAt: '2026-11-03T12:00:00Z',
      },
      losses: [
        {
          path: 'data.display.rule',
          kind: 'prerendered',
          note: 'Rule ids are shown by their names, from a lookup.',
        },
      ],
    },
  },
];
