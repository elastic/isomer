/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTitleNode } from './types';

/** Canonical {@link SlideTitleNode} example. */
export const example: SlideTitleNode = {
  type: 'slideTitle',
  eyebrow: 'A grocery delivery platform',
  title: 'Crate',
  tagline: 'One order. Every store.',
  definition: {
    term: 'crate n.',
    text: 'Everything a customer means to buy, carried from whichever store can fill it.',
  },
  aside: {
    type: 'slideBulletList',
    marker: 'check',
    items: [
      'Splits one order across nearby stores.',
      'Books one courier for the whole basket.',
      'Charges the card once.',
    ],
  },
};

export const soloExample: SlideTitleNode = {
  type: 'slideTitle',
  eyebrow: 'Quarterly review',
  title: 'Payments',
  tagline: 'Faster refunds, **fewer disputes**.',
};

export const minimalExample: SlideTitleNode = {
  type: 'slideTitle',
  title: 'Onboarding',
};

/** Conformance examples for {@link SlideTitleNode}. */
export const examples: SlideTitleNode[] = [
  example,
  soloExample,
  minimalExample,
];
