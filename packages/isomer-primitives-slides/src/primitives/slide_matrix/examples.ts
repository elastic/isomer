/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideMatrixNode } from './schema';

/** Canonical {@link SlideMatrixNode} example. */
export const example: SlideMatrixNode = {
  type: 'slideMatrix',
  columns: ['Card', 'Wallet', 'Bank', 'Invoice'],
  legend: true,
  rows: [
    { label: 'Instant capture', marks: ['full', 'full', 'none', 'none'] },
    { label: 'Partial refunds', marks: ['full', 'partial', 'full', 'none'] },
    { label: 'Recurring', marks: ['full', 'partial', 'full', 'full'] },
    { label: 'Disputes', marks: ['full', 'full', 'partial', 'none'] },
  ],
};

/** Six columns and eight rows, the most a matrix holds. */
export const fullExample: SlideMatrixNode = {
  type: 'slideMatrix',
  columns: ['iOS', 'Android', 'Web', 'Watch', 'TV', 'Car'],
  legend: true,
  rows: [
    {
      label: 'Offline maps',
      marks: ['full', 'full', 'none', 'partial', 'none', 'full'],
    },
    {
      label: 'Voice search',
      marks: ['full', 'full', 'partial', 'full', 'full', 'full'],
    },
    {
      label: 'Live traffic',
      marks: ['full', 'full', 'full', 'partial', 'none', 'full'],
    },
    {
      label: 'Saved places',
      marks: ['full', 'full', 'full', 'full', 'partial', 'partial'],
    },
    {
      label: 'Transit',
      marks: ['full', 'full', 'full', 'none', 'none', 'none'],
    },
    {
      label: 'Street view',
      marks: ['full', 'partial', 'full', 'none', 'full', 'none'],
    },
    {
      label: 'Sharing',
      marks: ['full', 'full', 'full', 'partial', 'none', 'partial'],
    },
    {
      label: 'Dark mode',
      marks: ['full', 'full', 'partial', 'full', 'full', 'full'],
    },
  ],
};

/** Two columns with no partial marks and no legend, the recommended one highlighted. */
export const pairExample: SlideMatrixNode = {
  type: 'slideMatrix',
  columns: ['Basic', 'Plus'],
  highlight: 1,
  legend: false,
  rows: [
    { label: 'Free delivery', marks: ['none', 'full'] },
    { label: 'Order tracking', marks: ['full', 'full'] },
    { label: 'Priority slots', marks: ['none', 'full'] },
  ],
};

/** Conformance examples for {@link SlideMatrixNode}. */
export const examples: SlideMatrixNode[] = [example, fullExample, pairExample];
