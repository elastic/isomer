/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { percentAlong } from './common';

describe('percentAlong', () => {
  it('stays finite where only the intermediate product passes the largest double', () => {
    expect(percentAlong(0, 1e308, 100)).toBe(1e308);
    expect(percentAlong(0, 1e308, 50)).toBe(5e307);
  });

  it('is not finite where the span passes the largest double', () => {
    expect(percentAlong(-1e308, 1e308, 50)).toBeNaN();
  });
});
