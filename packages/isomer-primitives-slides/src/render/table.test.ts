/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { displayColumns } from './mono';
import { textTable } from './table';

describe('displayColumns', () => {
  it.each([
    ['a plain letter', 'a', 1],
    ['a wide glyph', '界', 2],
    ['a letter and a combining mark', 'e\u0301', 1],
    ['a keycap emoji', '1\ufe0f\u20e3', 2],
    ['an emoji presentation selector', '\u2764\ufe0f', 2],
    ['a symbol drawn as text', '\u00a9', 1],
    ['an emoji', '\u{1f642}', 2],
    ['a joined family', '\u{1f469}\u200d\u{1f469}\u200d\u{1f467}', 2],
  ])('counts %s as its display width', (_name, text, columns) => {
    expect(displayColumns(text)).toBe(columns);
  });
});

describe('displayColumns with a limit', () => {
  it('stops counting once it passes the limit', () => {
    expect(displayColumns('a'.repeat(1_000_000), 10)).toBe(11);
    expect(displayColumns('abc', 10)).toBe(3);
  });
});

describe('textTable', () => {
  it('aligns columns by display width, wide glyphs and combining marks included', () => {
    const table = textTable(
      ['Name', 'Qty'],
      [
        ['界界', '1'],
        ['é', '2'],
        ['Tea', '3'],
      ]
    );
    const starts = table
      .split('\n')
      .map((line) => displayColumns(line.slice(0, line.lastIndexOf(' ') + 1)));
    expect(new Set(starts)).toEqual(new Set([starts[0]]));
  });
});
