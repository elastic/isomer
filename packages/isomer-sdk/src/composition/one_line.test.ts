/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { nameText, oneLine, quoteText } from './one_line';

const LINE_TERMINATOR = /[\n\r\u2028\u2029]/;

describe('quoteText', () => {
  it.each(['a\nb', 'a\rb', 'a\u2028b', 'a\u2029b'])(
    'keeps %j on one line',
    (text) => {
      expect(quoteText(text)).not.toMatch(LINE_TERMINATOR);
      expect(JSON.parse(quoteText(text))).toBe(text);
    }
  );

  it.each([
    '',
    '"',
    '\\',
    '\\u2028',
    'a & b &amp;',
    '{}',
    '[]',
    '<b>',
    '\t\u0000',
  ])('round-trips %j as one JSON string', (text) => {
    const quoted = quoteText(text);
    expect(quoted).toMatch(/^".*"$/s);
    expect(quoted).not.toMatch(LINE_TERMINATOR);
    expect(JSON.parse(quoted)).toBe(text);
  });
});

describe('nameText', () => {
  it('leaves a plain name bare', () => {
    expect(nameText('slide-stats_2')).toBe('slide-stats_2');
  });

  it('quotes any other name on one line', () => {
    expect(nameText('my kpi')).toBe('"my kpi"');
    expect(nameText('a\u2028b')).toBe('"a\\u2028b"');
  });
});

describe('oneLine', () => {
  it('collapses each run of line terminators and its surrounding whitespace', () => {
    expect(oneLine('a \r\n\n  b\u2028c\u2029 d')).toBe('a b c d');
  });

  it('keeps whitespace with no line terminator in it', () => {
    expect(oneLine('a  b\tc')).toBe('a  b\tc');
  });

  it('runs in linear time on a long whitespace run', () => {
    const started = performance.now();
    expect(oneLine(`a${' '.repeat(100_000)}b`)).toHaveLength(100_002);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
