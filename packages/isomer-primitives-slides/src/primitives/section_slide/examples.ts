/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SectionSlideNode } from './schema';

/** Canonical {@link SectionSlideNode} example. */
export const example: SectionSlideNode = {
  type: 'sectionSlide',
  number: '02',
  title: 'Settlement',
  slides: [
    { text: 'Refunds settle in two days, not five' },
    { text: 'The ledger writes before the fraud check' },
    { text: 'Three batch windows are gone' },
  ],
};

export const linkedExample: SectionSlideNode = {
  type: 'sectionSlide',
  number: '04',
  title: 'The incident',
  slides: [
    { text: 'Checkout failed for 41 minutes', href: '#slide-12' },
    {
      text: 'A certificate expired on **one** gateway',
      href: '#slide-13',
    },
    { text: 'Alerts fired, but to the wrong rotation', href: '#slide-14' },
    { text: 'Recovery took one config change', href: '#slide-15' },
    { text: 'What we changed afterwards', href: '#slide-16' },
  ],
};

/** The most lines a section holds. */
export const longExample: SectionSlideNode = {
  type: 'sectionSlide',
  number: '03',
  title: 'The release train',
  slides: [
    { text: 'Branches cut every Tuesday' },
    { text: 'Staging soaks for two days' },
    { text: 'Feature flags gate every change' },
    { text: 'Canaries take five percent of traffic' },
    { text: 'Rollback is one command' },
    { text: 'Release notes write themselves' },
    { text: 'Hotfixes skip the train' },
    { text: 'Nobody deploys on Friday' },
  ],
};

/** Conformance examples for {@link SectionSlideNode}. */
export const examples: SectionSlideNode[] = [
  example,
  linkedExample,
  longExample,
];
