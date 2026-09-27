/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  markdownCode,
  markdownText,
  marksMarkdown,
  marksSlack,
  parseMarks,
  stripMarks,
} from './marks';

describe('marks', () => {
  it('splits code and strong runs', () => {
    expect(parseMarks('Call `parse` before **render**.')).toEqual([
      { kind: 'text', text: 'Call ' },
      { kind: 'code', text: 'parse' },
      { kind: 'text', text: ' before ' },
      { kind: 'strong', text: 'render' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps unpaired markers literal', () => {
    expect(stripMarks('2 * 3 and a ` tick')).toBe('2 * 3 and a ` tick');
  });

  it('does not read strong inside code', () => {
    expect(parseMarks('`**x**`')).toEqual([{ kind: 'code', text: '**x**' }]);
  });

  it('strips marks for text', () => {
    expect(stripMarks('Call `parse` before **render**.')).toBe(
      'Call parse before render.'
    );
  });

  it('converts strong to Slack bold and escapes the rest', () => {
    expect(marksSlack('Call `a<b` before **render** & <go>.')).toBe(
      'Call `a<b` before *render* &amp; &lt;go&gt;.'
    );
  });
});

describe('markdownText', () => {
  it('turns every line terminator into a space', () => {
    expect(markdownText('a\nb\r\nc\rd\u2028e\u2029f')).toBe('a b c d e f');
  });

  it('escapes links, raw HTML, emphasis, code, and table pipes', () => {
    expect(markdownText('[x](javascript:alert(1))')).toBe(
      '\\[x\\](javascript:alert(1))'
    );
    expect(markdownText('<img src=x onerror=y>')).toBe(
      '\\<img src=x onerror=y\\>'
    );
    expect(markdownText('*a* _b_ `c` | d \\ &amp;')).toBe(
      '\\*a\\* \\_b\\_ \\`c\\` \\| d \\\\ \\&amp;'
    );
  });

  it('escapes a leading block marker, so a value never opens a block', () => {
    expect(markdownText('# Title')).toBe('\\# Title');
    expect(markdownText('- item')).toBe('\\- item');
    expect(markdownText('+ item')).toBe('\\+ item');
    expect(markdownText('1. item')).toBe('1\\. item');
    expect(markdownText('2) item')).toBe('2\\) item');
    expect(markdownText('a - b. 3.')).toBe('a - b. 3.');
    expect(markdownText('1.2K #hashtag -1')).toBe('1.2K #hashtag -1');
    expect(markdownText('### Deep')).toBe('\\### Deep');
    expect(markdownText('---')).toBe('\\---');
    expect(markdownText('=== ')).toBe('\\=== ');
    expect(markdownText('~~~js')).toBe('\\~~~js');
    expect(markdownText('    indented code')).toBe('indented code');
  });
});

describe('marksMarkdown', () => {
  it('keeps code and strong marks and escapes everything else', () => {
    expect(marksMarkdown('**Bold** and `a_b` and [x](y)')).toBe(
      '**Bold** and `a_b` and \\[x\\](y)'
    );
  });

  it('keeps a mark on one line', () => {
    expect(marksMarkdown('**a\u2028b** `c\rd`')).toBe('**a b** `c d`');
  });

  it('escapes a leading marker before its first mark', () => {
    expect(marksMarkdown('# **Bold**')).toBe('\\# **Bold**');
  });
});

describe('markdownCode', () => {
  it('is a plain code span for a clean value', () => {
    expect(markdownCode('pnpm verify')).toBe('`pnpm verify`');
  });

  it('fences past any backtick run and stays on one line', () => {
    expect(markdownCode('a ``b`` c')).toBe('```a ``b`` c```');
    expect(markdownCode('`edge`')).toBe('`` `edge` ``');
    expect(markdownCode('one\ntwo')).toBe('`one two`');
  });
});
