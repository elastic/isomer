/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideGraphNode } from './schema';

/** Canonical {@link SlideGraphNode} example: a four-node chain with one node above and one below. */
export const example: SlideGraphNode = {
  type: 'slideGraph',
  caption: 'A basket becomes an order once pricing and stock agree.',
  nodes: [
    {
      id: 'catalog',
      term: 'Catalog',
      body: 'Every product a store can sell.',
    },
    {
      id: 'basket',
      term: 'Basket',
      body: 'What a customer means to buy.',
    },
    {
      id: 'order',
      term: 'Order',
      body: 'A priced basket with a slot.',
      emphasis: true,
    },
    {
      id: 'delivery',
      term: 'Delivery',
      body: 'One van run, many orders.',
    },
    {
      id: 'pricing',
      term: 'Pricing',
      body: 'Offers, fixed at checkout.',
      placement: 'above',
    },
    {
      id: 'stock',
      term: 'Stock',
      body: 'What the store holds now.',
      placement: 'below',
    },
  ],
  edges: [
    ['catalog', 'basket'],
    ['basket', 'order'],
    ['order', 'delivery'],
    ['pricing', 'order'],
    ['stock', 'order'],
  ],
};

/** A two-node chain with a caption and nothing off the row. */
export const pairExample: SlideGraphNode = {
  type: 'slideGraph',
  caption: 'Every incident ends in a review, whatever its size.',
  nodes: [
    {
      id: 'incident',
      term: 'Incident',
      body: 'Something customers noticed, with a start and an end.',
    },
    {
      id: 'review',
      term: 'Review',
      body: 'A blameless write-up with owners for each follow-up.',
      emphasis: true,
    },
  ],
  edges: [['incident', 'review']],
};

/** Three in the row, a node above the first, and an edge pointing down out of the row. */
export const outwardEdgesExample: SlideGraphNode = {
  type: 'slideGraph',
  caption: 'A release ships a build; the changelog is written from it.',
  nodes: [
    {
      id: 'commit',
      term: 'Commit',
      body: 'One reviewed change on the main branch.',
    },
    {
      id: 'build',
      term: 'Build',
      body: 'An immutable artifact made from one commit.',
    },
    {
      id: 'release',
      term: 'Release',
      body: 'A build promoted to customers.',
      emphasis: true,
    },
    {
      id: 'policy',
      term: 'Policy',
      body: 'Checks every commit must pass before it lands.',
      placement: 'above',
    },
    {
      id: 'changelog',
      term: 'Changelog',
      body: 'The customer-facing notes for a release.',
      placement: 'below',
    },
  ],
  edges: [
    ['commit', 'build'],
    ['build', 'release'],
    ['policy', 'commit'],
    ['release', 'changelog'],
  ],
};

/** Conformance examples for {@link SlideGraphNode}. */
export const examples: SlideGraphNode[] = [
  example,
  pairExample,
  outwardEdgesExample,
];
