/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { displayColumns } from './mono';

describe('displayColumns', () => {
  it('counts wide glyphs and emoji as two, marks and controls as none', () => {
    expect(displayColumns('abc')).toBe(3);
    expect(displayColumns('界界')).toBe(4);
    expect(displayColumns('🙂')).toBe(2);
    expect(displayColumns('e\u0301')).toBe(1);
    expect(displayColumns('a\u200db')).toBe(2);
  });

  it('stops counting once past the limit', () => {
    expect(displayColumns('x'.repeat(100), 3)).toBe(4);
  });
});
