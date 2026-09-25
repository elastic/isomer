/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideColumnsNode } from './schema';

/** Canonical {@link SlideColumnsNode} example. */
export const example: SlideColumnsNode = {
  type: 'slideColumns',
  items: [
    {
      title: 'Canary',
      tags: ['1%', '10%', '50%'],
      body: 'A slice of traffic takes the new build first, so a bad release hurts few customers.',
    },
    {
      title: 'Blue-green',
      tags: ['blue', 'green'],
      body: 'Two full fleets. The switch is instant, and so is the way back.',
    },
    {
      title: 'Rolling',
      tags: ['zone-a', 'zone-b', 'zone-c', 'zone-d'],
      body: 'One zone at a time, with no spare capacity to pay for.',
    },
  ],
  footnote: {
    code: 'auto-rollback',
    text: 'returns any of the three to the last healthy build.',
  },
};

/** Two columns with no tags and no footnote. */
export const plainExample: SlideColumnsNode = {
  type: 'slideColumns',
  items: [
    {
      title: 'Build it',
      tags: [],
      body: 'Six weeks for two engineers, and the pricing rules stay ours.',
    },
    {
      title: 'Buy it',
      tags: [],
      body: 'Live next sprint, at the cost of a fee on every order.',
    },
  ],
};

/** Four columns, the most a row holds. */
export const wideExample: SlideColumnsNode = {
  type: 'slideColumns',
  items: [
    { title: 'Web', tags: ['react'], body: 'The full catalog, with filters.' },
    { title: 'iOS', tags: ['swift'], body: 'Reorder in two taps.' },
    {
      title: 'Android',
      tags: ['kotlin'],
      body: 'Offline cart that syncs later.',
    },
    {
      title: 'Kiosk',
      tags: ['react', 'native'],
      body: 'In-store pickup and returns.',
    },
  ],
};

/** Conformance examples for {@link SlideColumnsNode}. */
export const examples: SlideColumnsNode[] = [
  example,
  plainExample,
  wideExample,
];
