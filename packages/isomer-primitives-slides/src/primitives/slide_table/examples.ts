/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTableNode } from './schema';

/** Canonical {@link SlideTableNode} example. */
export const example: SlideTableNode = {
  type: 'slideTable',
  label: 'Validation posture',
  columns: ['Surface', 'On invalid input'],
  rowHeaders: true,
  rows: [
    ['html', 'Renders and reports findings'],
    ['text', 'Throws'],
    ['react', 'Never validates'],
  ],
};

/** No label and no row headers. */
export const plainExample: SlideTableNode = {
  type: 'slideTable',
  columns: ['Package', 'Role', 'Peers'],
  rows: [
    ['sdk', 'Contracts', 'react, zod'],
    ['runtime', 'Assembly', 'react, react-dom, zod'],
  ],
};

/** Conformance examples for {@link SlideTableNode}. */
export const examples: SlideTableNode[] = [example, plainExample];
