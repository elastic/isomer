/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { collapsedColumns, displayColumns } from './mono';

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

describe('collapsedColumns', () => {
  it.each(['\n', '\r\n', '\t', '  ', ' \n\t '])(
    'counts the run %j as the one space it draws',
    (run) => {
      expect(collapsedColumns(`a${run}b`)).toBe(3);
      expect(collapsedColumns(`a${run}b${run}c`)).toBe(5);
    }
  );

  it('keeps a space that does not collapse', () => {
    expect(collapsedColumns('a\u00a0\u00a0b')).toBe(4);
  });

  it.each(['\f', '\v'])('counts %j as a space of its own', (control) => {
    expect(collapsedColumns(`a${control}b`)).toBe(3);
    expect(collapsedColumns(`a ${control} b`)).toBe(5);
  });

  it('reads a long run in linear time', () => {
    const started = performance.now();
    expect(collapsedColumns(`a${' \n'.repeat(500_000)}b`)).toBe(3);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
