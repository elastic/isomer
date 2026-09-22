/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { schema } from './schema';

describe('slideFlow.boundaryAfter', () => {
  it('rejects a boundary at or past the last node', () => {
    const result = schema.safeParse({
      type: 'slideFlow',
      nodes: ['a', 'b', 'c'],
      boundaryAfter: 3,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a boundary within the node list', () => {
    const result = schema.safeParse({
      type: 'slideFlow',
      nodes: ['a', 'b', 'c'],
      boundaryAfter: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts no boundary at all', () => {
    const result = schema.safeParse({
      type: 'slideFlow',
      nodes: ['a', 'b'],
    });
    expect(result.success).toBe(true);
  });
});
