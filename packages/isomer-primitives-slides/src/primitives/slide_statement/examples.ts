/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideStatementNode } from './schema';

/** Canonical {@link SlideStatementNode} example. */
export const example: SlideStatementNode = {
  type: 'slideStatement',
  text: 'A refund is **a promise**, not a transaction.',
};

/** A longer sentence that takes a smaller step. */
export const longExample: SlideStatementNode = {
  type: 'slideStatement',
  text: 'Customers stopped calling support once the app told them **when** the refund would land and **which card** it would reach.',
};

/** Conformance examples for {@link SlideStatementNode}. */
export const examples: SlideStatementNode[] = [example, longExample];
