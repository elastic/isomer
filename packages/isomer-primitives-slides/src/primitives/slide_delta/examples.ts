/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideDeltaNode } from './schema';

/** Canonical {@link SlideDeltaNode} example. */
export const example: SlideDeltaNode = {
  type: 'slideDelta',
  before: { label: 'Old checkout', value: '4.2s' },
  after: { label: 'New checkout', value: '1.1s' },
  change: '−74%',
  body: 'Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic.',
};

/** Wider values take a smaller step. */
export const wideExample: SlideDeltaNode = {
  type: 'slideDelta',
  before: { label: 'January', value: '12,480' },
  after: { label: 'June', value: '31,905' },
  change: '+156%',
  body: 'Monthly active drivers after the referral bonus launched in March.',
};

/** The new number is not measured yet, so there is no change to state. */
export const pendingExample: SlideDeltaNode = {
  type: 'slideDelta',
  before: { label: 'Before the move', value: '38' },
  after: { label: 'After the move' },
  body: 'Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.',
};

/** Conformance examples for {@link SlideDeltaNode}. */
export const examples: SlideDeltaNode[] = [
  example,
  wideExample,
  pendingExample,
];
