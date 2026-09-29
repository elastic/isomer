/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideHeadingNode } from './schema';

/** Canonical {@link SlideHeadingNode} example. */
export const example: SlideHeadingNode = {
  type: 'slideHeading',
  title: 'Refunds settle in two days, not five',
  lede: 'Moving the ledger write ahead of the fraud check removed three batch windows.',
};

export const titleOnlyExample: SlideHeadingNode = {
  type: 'slideHeading',
  title: 'Every region now reads from one catalog',
};

/** Conformance examples for {@link SlideHeadingNode}. */
export const examples: SlideHeadingNode[] = [example, titleOnlyExample];
