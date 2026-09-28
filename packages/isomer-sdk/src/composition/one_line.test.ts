/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  jsonLine,
  listBounded,
  nameText,
  oneLine,
  quoteInput,
} from './one_line';

describe('oneLine', () => {
  it('replaces every line terminator with a space', () => {
    expect(oneLine('a\nb\r\nc\rd\u2028e\u2029f')).toBe('a b c d e f');
  });
});

describe('jsonLine', () => {
  it('prints a BigInt, which JSON.stringify refuses, as its literal', () => {
    expect(jsonLine(1n)).toBe('1n');
    expect(jsonLine({ n: 1n, list: [2n] })).toBe('{"n":"1n","list":["2n"]}');
  });

  it('escapes the two terminators JSON.stringify leaves raw', () => {
    expect(jsonLine('a\u2028b\u2029c')).toBe('"a\\u2028b\\u2029c"');
    expect(jsonLine(undefined)).toBe('undefined');
  });
});

describe('quoteInput', () => {
  it('quotes a short input whole', () => {
    expect(quoteInput('slideBarz')).toBe('"slideBarz"');
  });

  it('cuts a long input to 100 characters and marks the cut', () => {
    const quoted = quoteInput('x'.repeat(250));
    expect(quoted).toBe(`"${'x'.repeat(100)}…"`);
  });

  it('stays on one line when the cut input holds a line separator', () => {
    const quoted = quoteInput(`a\u2028${'b'.repeat(200)}`);
    expect(quoted).not.toMatch(/[\n\r\u2028\u2029]/);
    expect(quoted.startsWith('"a\\u2028bb')).toBe(true);
  });

  it('does not cut a surrogate pair in half', () => {
    const quoted = quoteInput(`${'a'.repeat(99)}\u{1f642}${'b'.repeat(50)}`);
    expect(quoted).toBe(`"${'a'.repeat(99)}\u{1f642}…"`);
    expect(quoted).not.toMatch(/[\uD800-\uDFFF]/u);
  });
});

describe('nameText', () => {
  it('leaves a plain name bare and quotes any other', () => {
    expect(nameText('slide_bars')).toBe('slide_bars');
    expect(nameText('a b')).toBe('"a b"');
    expect(nameText('line\nbreak')).toBe('"line\\nbreak"');
  });
});

describe('listBounded', () => {
  it('lists at most ten items and counts the rest', () => {
    const items = Array.from({ length: 12 }, (_, index) => `t${index}`);
    expect(listBounded(items.slice(0, 3))).toBe('t0, t1, t2');
    expect(listBounded(items)).toBe(
      `${items.slice(0, 10).join(', ')} and 2 more`
    );
  });
});
