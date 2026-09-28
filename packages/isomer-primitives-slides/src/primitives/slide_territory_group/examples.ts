/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTerritoryGroupNode } from './schema';

/** Canonical {@link SlideTerritoryGroupNode} example. */
export const example: SlideTerritoryGroupNode = {
  type: 'slideTerritoryGroup',
  items: [
    {
      title: 'Payments team',
      body: 'Card capture, fraud checks, and **the ledger write**.',
      tone: 'primary',
    },
    {
      title: 'Card network',
      body: 'Authorization, chargebacks, and settlement timing.',
      tone: 'accent',
    },
  ],
};

/** Four owners, the most a row holds, including a neutral one with no tone. */
export const fullExample: SlideTerritoryGroupNode = {
  type: 'slideTerritoryGroup',
  items: [
    { title: 'Storefront', body: 'Catalog, search, and the cart.' },
    {
      title: 'Fulfillment',
      body: 'Picking, packing, and handoff.',
      tone: 'primary',
    },
    {
      title: 'Couriers',
      body: 'The drive and proof of delivery.',
      tone: 'accent',
    },
    {
      title: 'Stores',
      body: 'Stock counts and substitutions.',
      tone: 'accent',
    },
  ],
};

/** Conformance examples for {@link SlideTerritoryGroupNode}. */
export const examples: SlideTerritoryGroupNode[] = [example, fullExample];
