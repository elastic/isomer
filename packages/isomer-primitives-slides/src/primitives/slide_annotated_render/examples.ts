/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';

import type { SlideAnnotatedRenderNode } from './types';

/** A results slide, as the composition the example annotates. */
export const checkoutSlide: Composition<BodyNode> = {
  type: 'view',
  title: 'Checkout results',
  body: [
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
          type: 'slideStats',
          items: [
            { value: '3', label: 'Regions', body: 'Active-active in each.' },
            {
              value: '40',
              unit: 'ms',
              label: 'p99 latency',
              body: 'Measured at the edge.',
            },
            {
              value: '0',
              label: 'Failed payments',
              body: 'Across both failovers.',
            },
          ],
        },
      ],
    },
  ],
};

/** Canonical {@link SlideAnnotatedRenderNode} example: the parts of a results slide. */
export const example: SlideAnnotatedRenderNode = {
  type: 'slideAnnotatedRender',
  render: {
    type: 'slideRender',
    slide: 'checkout-results',
    composition: checkoutSlide,
    surface: 'svg',
    caption: 'The checkout results slide, from the svg surface',
  },
  pins: [
    {
      x: 81,
      y: 14,
      title: 'Claim',
      body: 'The one sentence the audience should leave with.',
    },
    {
      x: 60,
      y: 52,
      title: 'Evidence',
      body: 'Three numbers, each with the label that makes it **mean** something.',
    },
    {
      x: 27,
      y: 93,
      title: 'Footer',
      body: 'Brand and section, the same on every slide.',
    },
  ],
};

/** A reference the host has not filled in: pins on the placeholder, and the legend at its densest. */
export const placeholderExample: SlideAnnotatedRenderNode = {
  type: 'slideAnnotatedRender',
  render: {
    type: 'slideRender',
    slide: '07',
    surface: 'svg',
  },
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
