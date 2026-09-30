/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideSectionNode } from './schema';

/** Canonical {@link SlideSectionNode} example. */
export const example: SlideSectionNode = {
  type: 'slideSection',
  number: '02',
  title: 'Settlement',
  contents: [
    'Refunds settle in two days, not five',
    'The ledger writes before the fraud check',
    'Three batch windows are gone',
  ],
};

export const linkedExample: SlideSectionNode = {
  type: 'slideSection',
  number: '04',
  title: 'The incident',
  contents: [
    'Checkout failed for 41 minutes',
    'A certificate expired on **one** gateway',
    'Alerts fired, but to the wrong rotation',
    'Recovery took one config change',
    'What we changed afterwards',
  ],
  hrefs: ['#slide-12', '#slide-13', '#slide-14', '#slide-15', '#slide-16'],
};

/** The most lines a section holds. */
export const longExample: SlideSectionNode = {
  type: 'slideSection',
  number: '03',
  title: 'The release train',
  contents: [
    'Branches cut every Tuesday',
    'Staging soaks for two days',
    'Feature flags gate every change',
    'Canaries take five percent of traffic',
    'Rollback is one command',
    'Release notes write themselves',
    'Hotfixes skip the train',
    'Nobody deploys on Friday',
  ],
};

/** Conformance examples for {@link SlideSectionNode}. */
export const examples: SlideSectionNode[] = [
  example,
  linkedExample,
  longExample,
];
