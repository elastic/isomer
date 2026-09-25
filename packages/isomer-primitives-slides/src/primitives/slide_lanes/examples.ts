/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLanesNode } from './schema';

/** Canonical {@link SlideLanesNode} example. */
export const example: SlideLanesNode = {
  type: 'slideLanes',
  lanes: [
    { label: 'Web', steps: ['Basket', 'Address', 'Slot', 'Review'] },
    { label: 'Phone', steps: ['Call', 'Agent form', 'Read back', 'Confirm'] },
  ],
  join: 'Place order',
  notes: [
    {
      title: 'Self-serve',
      body: 'The customer picks the slot. Validation runs on every field as they type.',
    },
    {
      title: 'Assisted',
      body: 'An agent keys the order while the customer waits, then reads it back before placing it.',
    },
  ],
};

/** Lanes of different lengths and no notes. */
export const unevenLanesExample: SlideLanesNode = {
  type: 'slideLanes',
  lanes: [
    { label: 'Hotfix', steps: ['Patch', 'Review'] },
    { label: 'Release', steps: ['Branch', 'Soak', 'Sign-off', 'Tag', 'Notes'] },
  ],
  join: 'Deploy',
};

/** Four notes, two rows under the lanes. */
export const fourNotesExample: SlideLanesNode = {
  type: 'slideLanes',
  lanes: [
    { label: 'Card', steps: ['Tokenize', 'Authorize'] },
    { label: 'Wallet', steps: ['Redirect', 'Approve', 'Callback'] },
  ],
  join: 'Capture',
  notes: [
    {
      title: 'Card is instant',
      body: 'Authorization returns in one round trip.',
    },
    { title: 'Wallet waits', body: 'The customer leaves the page to approve.' },
    { title: 'Same capture', body: 'Both settle through one capture call.' },
    { title: 'Same refunds', body: 'Refunds never need to know the path.' },
  ],
};

/** Conformance examples for {@link SlideLanesNode}. */
export const examples: SlideLanesNode[] = [
  example,
  unevenLanesExample,
  fourNotesExample,
];
