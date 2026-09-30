/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md, serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import {
  marksMarkdown,
  marksSlack,
  parseMarks,
  plainText,
  stripMarks,
  strongMarksMarkdown,
  strongMarksRichText,
} from './marks';

describe('marks', () => {
  it('moves whitespace at a strong run’s edges outside it, so every surface reads the same emphasis', () => {
    expect(parseMarks('a ** bold ** b')).toEqual([
      { kind: 'text', text: 'a  ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: '  b' },
    ]);
    expect(marksSlack('a ** bold ** b')).toBe('a  *bold*  b');
    expect(parseMarks('**   **')).toEqual([{ kind: 'text', text: '**   **' }]);
  });

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

  it.each([
    ['\\n', '\n'],
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', '\u2028'],
    ['U+2029', '\u2029'],
  ])('reads a mark across %s on every surface', (_name, terminator) => {
    const text = `**a${terminator}b** \`c${terminator}d\``;
    expect(parseMarks(text)).toEqual([
      { kind: 'strong', text: `a${terminator}b` },
      { kind: 'text', text: ' ' },
      { kind: 'code', text: `c${terminator}d` },
    ]);
    expect(plainText(text)).toBe('a b c d');
    expect(marksSlack(text)).toBe(`*a${terminator}b* \`c${terminator}d\``);
  });

  it('does not read strong inside code', () => {
    expect(parseMarks('`**x**`')).toEqual([{ kind: 'code', text: '**x**' }]);
  });

  it.each([
    ['\\n', '\n'],
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', '\u2028'],
    ['U+2029', '\u2029'],
  ])('puts text on one line across %s', (_name, terminator) => {
    expect(oneLine(`a${terminator}b`)).toBe('a b');
    expect(plainText(`**a**${terminator}\`b\``)).toBe('a b');
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

  it('builds Markdown marks and escapes the rest', () => {
    expect(
      serializeMarkdown(
        md.paragraph(...marksMarkdown('Call `a*b` before **render** & *go*.'))
      )
    ).toBe('Call `a*b` before **render** & \\*go\\*.');
  });

  it('reads a strong run with a long whitespace run in linear time', () => {
    const started = performance.now();
    expect(parseMarks(`**a${' '.repeat(100_000)}b**`)).toHaveLength(1);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('sets a whole text in strong, folding its own strong in and keeping code', () => {
    const text = 'Run `make` **now** please';
    expect(serializeMarkdown(md.paragraph(strongMarksMarkdown(text)))).toBe(
      '**Run `make` now please**'
    );
    expect(strongMarksRichText(text)).toEqual([
      { type: 'text', text: 'Run ', style: { bold: true } },
      { type: 'text', text: 'make', style: { code: true, bold: true } },
      { type: 'text', text: ' ', style: { bold: true } },
      { type: 'text', text: 'now', style: { bold: true } },
      { type: 'text', text: ' please', style: { bold: true } },
    ]);
  });
});
