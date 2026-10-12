/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StatementSlideNode } from './schema';

/** Canonical {@link StatementSlideNode} example. */
export const example: StatementSlideNode = {
  type: 'statementSlide',
  text: 'A refund is **a promise**, not a transaction.',
};

/** A longer sentence that takes a smaller step. */
export const longExample: StatementSlideNode = {
  type: 'statementSlide',
  text: 'Customers stopped calling support once the app told them **when** the refund would land and **which card** it would reach.',
};

/** Conformance examples for {@link StatementSlideNode}. */
export const examples: StatementSlideNode[] = [example, longExample];
