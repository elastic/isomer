/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BodyNode } from '../../body_node';

import type { SlideAnnotatedRenderNode } from './types';

/** A results slide, as the body the example annotates. */
export const checkoutSlide: readonly BodyNode[] = [
  {
    type: 'slideFrame',
    brand: 'Basket',
    section: 'Checkout',
    sectionNumber: '03',
    body: [
      {
        type: 'slideHeading',
        title: 'Checkout held through the spring sale',
        lede: 'Two regional failovers, and no customer noticed either.',
      },
      {
        type: 'slideBulletList',
        marker: 'check',
        items: [
          'Three regions, active-active.',
          'A p99 of 40 ms at the edge.',
          'No failed payments across both failovers.',
        ],
      },
    ],
  },
];

/** Canonical {@link SlideAnnotatedRenderNode} example: the parts of a results slide. */
export const example: SlideAnnotatedRenderNode = {
  type: 'slideAnnotatedRender',
  render: {
    type: 'slideRender',
    slide: 'checkout-results',
    body: checkoutSlide,
    surface: 'snapshot',
    caption: 'The checkout results slide, from the snapshot surface',
  },
  pins: [
    {
      x: 84,
      y: 14,
      title: 'Claim',
      body: 'The one sentence the audience should leave with.',
    },
    {
      x: 62,
      y: 62,
      title: 'Evidence',
      body: 'Three facts, each one line, that make the claim **true**.',
    },
    {
      x: 30,
      y: 94,
      title: 'Footer',
      body: 'Brand and section, the same on every slide.',
    },
  ],
};

/** A reference the host has not filled in: pins on the placeholder, and the legend at its densest. */
export const placeholderExample: SlideAnnotatedRenderNode = {
  type: 'slideAnnotatedRender',
  render: { type: 'slideRender', slide: 'orders-admin', surface: 'snapshot' },
  pins: [
    { x: 20, y: 16, title: 'Search', body: 'Filters by store and date.' },
    { x: 78, y: 16, title: 'Export', body: 'Downloads the rows as CSV.' },
    { x: 30, y: 50, title: 'Order row', body: 'Opens the order on click.' },
    { x: 86, y: 50, title: 'Status', body: 'Refunded orders show in grey.' },
    { x: 50, y: 84, title: 'Totals', body: 'Recomputed as filters change.' },
    { x: 90, y: 90, title: 'Pages', body: 'Fifty orders per page.' },
  ],
};

/** Conformance examples for {@link SlideAnnotatedRenderNode}. */
export const examples: SlideAnnotatedRenderNode[] = [
  example,
  placeholderExample,
];
