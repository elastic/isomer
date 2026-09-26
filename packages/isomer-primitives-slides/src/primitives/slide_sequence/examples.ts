/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideSequenceNode } from './schema';

/** Canonical {@link SlideSequenceNode} example: a declined card, then a retry. */
export const example: SlideSequenceNode = {
  type: 'slideSequence',
  actors: [
    { id: 'shopper', label: 'shopper' },
    { id: 'store', label: 'store', tone: 'primary' },
    { id: 'psp', label: 'payments' },
    { id: 'bank', label: 'bank', tone: 'accent' },
  ],
  messages: [
    { from: 'shopper', to: 'store', label: 'Place order' },
    { from: 'store', to: 'psp', label: 'authorize(card)', mono: true },
    { from: 'psp', to: 'bank', label: 'Charge request' },
    { from: 'bank', to: 'psp', label: 'DECLINED 51', mono: true },
    { from: 'store', to: 'shopper', label: 'Try another card' },
    { from: 'shopper', to: 'store', label: 'Second card' },
    { from: 'psp', to: 'store', label: 'Approved' },
  ],
};

/** Five actors and ten messages, the most the slide holds. */
export const fullExample: SlideSequenceNode = {
  type: 'slideSequence',
  actors: [
    { id: 'diner', label: 'diner' },
    { id: 'app', label: 'app', tone: 'primary' },
    { id: 'kitchen', label: 'kitchen', tone: 'accent' },
    { id: 'courier', label: 'courier' },
    { id: 'bank', label: 'bank' },
  ],
  messages: [
    { from: 'diner', to: 'app', label: 'Order two ramen' },
    { from: 'app', to: 'bank', label: 'hold(24.00)', mono: true },
    { from: 'bank', to: 'app', label: 'Hold approved' },
    { from: 'app', to: 'kitchen', label: 'New ticket' },
    { from: 'kitchen', to: 'app', label: 'Ready in **15 min**' },
    { from: 'app', to: 'courier', label: 'Pick up at 7:40' },
    { from: 'courier', to: 'kitchen', label: 'Collect the bag' },
    { from: 'courier', to: 'diner', label: 'Delivered' },
    { from: 'app', to: 'bank', label: 'capture(24.00)', mono: true },
    { from: 'app', to: 'diner', label: 'Receipt' },
  ],
};

/** Three actors and four messages. */
export const shortExample: SlideSequenceNode = {
  type: 'slideSequence',
  actors: [
    { id: 'user', label: 'user' },
    { id: 'site', label: 'site', tone: 'primary' },
    { id: 'mail', label: 'mail', tone: 'accent' },
  ],
  messages: [
    { from: 'user', to: 'site', label: 'Forgot password' },
    { from: 'site', to: 'mail', label: 'Send reset link' },
    { from: 'mail', to: 'user', label: 'Reset email' },
    { from: 'user', to: 'site', label: 'POST /reset', mono: true },
  ],
};

/** Conformance examples for {@link SlideSequenceNode}. */
export const examples: SlideSequenceNode[] = [
  example,
  fullExample,
  shortExample,
];
