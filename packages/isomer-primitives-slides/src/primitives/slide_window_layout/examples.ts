/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkExample } from '../slide_bullet_list/examples';
import {
  bareExample as bareCodeExample,
  example as codeExample,
} from '../slide_code/examples';

import type { SlideWindowLayoutNode } from './types';

/** Canonical {@link SlideWindowLayoutNode} example. */
export const example: SlideWindowLayoutNode = {
  type: 'slideWindowLayout',
  chrome: 'slack',
  title: 'checkout-oncall',
  body: [checkExample],
};

export const terminalExample: SlideWindowLayoutNode = {
  type: 'slideWindowLayout',
  chrome: 'terminal',
  title: '~/shop — release',
  body: [bareCodeExample],
};

export const chatExample: SlideWindowLayoutNode = {
  type: 'slideWindowLayout',
  chrome: 'chat',
  title: 'Build assistant',
  body: [
    {
      type: 'slideBulletList',
      items: [
        'The refund writes the ledger first.',
        'Fraud checks run after the write.',
      ],
    },
  ],
};

/** Two nodes in one window. */
export const browserExample: SlideWindowLayoutNode = {
  type: 'slideWindowLayout',
  chrome: 'browser',
  title: 'github.com/shop/checkout/pull/412',
  body: [
    codeExample,
    {
      type: 'slideBulletList',
      marker: 'check',
      items: ['Ledger written before the fraud check.'],
    },
  ],
};

/** Conformance examples for {@link SlideWindowLayoutNode}. */
export const examples: SlideWindowLayoutNode[] = [
  example,
  terminalExample,
  chatExample,
  browserExample,
];
