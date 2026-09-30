/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTreeNode } from './schema';

/** Canonical {@link SlideTreeNode} example. */
export const example: SlideTreeNode = {
  type: 'slideTree',
  root: 'checkout/',
  entries: [
    { name: 'cart.ts', body: 'Line items, quantities, and the running total' },
    { name: 'pricing.ts', body: 'Discounts and tax, applied in a fixed order' },
    { name: 'payment/', body: 'One adapter per card network' },
    { name: 'receipt.ts', body: 'The email and the in-app copy' },
    { name: 'checkout.test.ts', body: 'Every path a real order has taken' },
  ],
};

/** A single entry draws only the closing connector. */
export const singleExample: SlideTreeNode = {
  type: 'slideTree',
  root: 'runbooks/',
  entries: [
    {
      name: 'failover.md',
      body: 'Steps to move traffic to the standby region',
    },
  ],
};

/** Eight entries, the most the schema takes. */
export const fullExample: SlideTreeNode = {
  type: 'slideTree',
  root: 'release/',
  entries: [
    { name: 'CHANGELOG.md', body: 'What changed, for customers' },
    { name: 'build.yml', body: 'Compiles and signs every artifact' },
    { name: 'canary.yml', body: 'Sends one percent of traffic first' },
    { name: 'rollback.yml', body: 'Restores the last healthy build' },
    { name: 'flags.json', body: 'Features that ship dark' },
    { name: 'smoke/', body: 'Checks that run after each stage' },
    { name: 'dashboards/', body: 'Error rate and latency per region' },
    { name: 'README.md', body: 'How to cut a release by hand' },
  ],
};

/** Conformance examples for {@link SlideTreeNode}. */
export const examples: SlideTreeNode[] = [example, singleExample, fullExample];
