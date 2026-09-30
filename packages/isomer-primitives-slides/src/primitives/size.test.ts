/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../examples/fonts';
import { font, type } from '../theme/base';
import { heading } from '../theme/components/heading';
import { marks } from '../theme/components/marks';
import { split } from '../theme/components/split';
import { scalePx } from '../theme/scale';
import { type TypeRole, typeRole } from '../theme/type_role';

import {
  emWidth,
  lineBox,
  markedLines,
  measureText,
  monoLines,
  proseLines,
  rowLoad,
  sizeForLines,
  sizeForLoad,
  widestWord,
  wrappedLines,
} from './size';

const steps = { l: font.size.px200, m: font.size.px128, s: font.size.px96 };

describe('sizeForLoad', () => {
  const budget = { l: 100, m: 200 };

  it('takes the largest step whose budget holds the load', () => {
    expect(sizeForLoad(undefined, 100, budget)).toBe('l');
    expect(sizeForLoad(undefined, 101, budget)).toBe('m');
    expect(sizeForLoad(undefined, 201, budget)).toBe('s');
  });

  it('scales the load by crowding', () => {
    expect(sizeForLoad(undefined, 80, budget, 1.5)).toBe('m');
    expect(sizeForLoad(undefined, 150, budget, 0.5)).toBe('l');
  });

  it('keeps an explicit size', () => {
    expect(sizeForLoad('s', 1, budget)).toBe('s');
    expect(sizeForLoad('l', 1000, budget, 3)).toBe('l');
  });
});

describe('rowLoad', () => {
  it('multiplies the longest item by the item count', () => {
    expect(rowLoad([['ab', 'cd'], ['abc', undefined], ['a']])).toBe(12);
    expect(rowLoad([['日本']])).toBe(4);
    expect(rowLoad([])).toBe(0);
  });

  it('counts a whitespace run or line terminator as one space', () => {
    expect(rowLoad([['a\n\n\nb', 'c    d']])).toBe(6);
  });
});

describe('markedLines', () => {
  const body = { ...type.body, size: font.size.px26 };
  const mono = { ...body, ...marks.code };
  const strong = { ...body, ...marks.strong };
  const chipSide = scalePx(marks.codePaddingX) + scalePx(marks.codeBorder);
  const call = 'x'.repeat(17);
  const width = 276;

  it('counts prose as measureText does', () => {
    const text = 'Match the order, the amount, and the card on file';
    expect(markedLines(text, body, width)).toBe(
      measureText(text, body, width).lines
    );
    expect(markedLines(text, body, width)).toBeGreaterThan(1);
  });

  // Seventeen mono columns fit the line; the chip's padding and border tip them over it.
  it('sets a `code` run in the mono face, between its chip’s sides', () => {
    expect(measureText(call, mono).widest).toBeLessThanOrEqual(width);
    expect(markedLines(call, body, width)).toBe(1);
    expect(markedLines(`\`${call}\``, body, width)).toBe(2);
    expect(markedLines(`\`${call.slice(1)}\``, body, width)).toBe(1);
  });

  it('sets a `strong` run in the bold face', () => {
    const text = 'mmmm mmmm';
    const fits = measureText(text, body).widest;
    expect(measureText(text, strong).widest).toBeGreaterThan(fits);
    expect(markedLines(text, body, fits)).toBe(1);
    expect(markedLines(`**${text}**`, body, fits)).toBe(2);
  });

  it('keeps runs with no space between them one word', () => {
    const joined =
      measureText('abcd', body).widest + measureText('efgh', strong).widest;
    expect(markedLines('abcd**efgh**', body, joined)).toBe(1);
    expect(markedLines('abcd **efgh**', body, joined)).toBe(2);
    const chipped =
      measureText('ab', mono).widest +
      2 * chipSide +
      measureText('.', body).widest;
    expect(markedLines('`ab`.', body, chipped)).toBe(1);
    expect(markedLines('`ab`\u2028.', body, chipped)).toBe(2);
  });

  it('breaks a word wider than the line between glyphs', () => {
    expect(markedLines('x'.repeat(80), body, width)).toBe(4);
  });

  it('counts one line for no text', () => {
    expect(markedLines('', body, width)).toBe(1);
  });
});

describe('sizeForLines', () => {
  it('measures every word proportionally when choosing a step', () => {
    const tracking = heading.title.tracking;
    const wide = 'WWWWWWWWWW';
    const width = emWidth(wide, tracking) * scalePx(steps.m) + 1;
    expect(sizeForLines(undefined, wide, tracking, width, steps)).toBe('m');
    expect(
      sizeForLines(undefined, `iiiiiiiiii ${wide}`, tracking, width, steps)
    ).toBe('m');
    expect(widestWord(`iiiiiiiiii ${wide}`, tracking)).toBe(
      emWidth(wide, tracking)
    );
  });
});

describe('text measures', () => {
  it('reads narrow glyphs narrower than wide ones', () => {
    const none = font.tracking.none;
    expect(emWidth('ill', none)).toBeLessThan(emWidth('mmm', none));
    expect(emWidth('abc', font.tracking.max)).toBeLessThan(
      emWidth('abc', none)
    );
  });
});

describe('measureText', () => {
  // A regular column is 14px at 28px; a mono one 15.6px at 26px.
  const { body, mono } = type;
  const long = 'x'.repeat(100);

  it('sets text in its role’s transform', () => {
    const label = measureText('Before', split.label);
    expect(label).toEqual(measureText('BEFORE', split.label));
    const { transform: _, ...unset } = split.label;
    expect(label.widest).toBeGreaterThan(measureText('Before', unset).widest);
  });

  it('keeps `nowrap` text on one line however narrow', () => {
    const nowrap = { ...body, whiteSpace: font.whiteSpace.nowrap };
    expect(measureText('one two three', nowrap, 10)).toEqual({
      lines: 1,
      widest: 13 * 14,
    });
    expect(measureText('one two three', body, 10).lines).toBeGreaterThan(1);
  });

  it('measures a step at the size the role gives it', () => {
    const title = 'Four words carry the rest of this talk about payments';
    const at = (step: 'l' | 's', width = Infinity) =>
      measureText(
        title,
        { ...heading.title, size: heading.titleSizes[step] },
        width
      );
    const width = at('s').widest;
    expect(at('s', width).lines).toBe(1);
    expect(at('l', width).lines).toBe(2);
  });

  it('reads its face from the role', () => {
    expect(measureText('abc', body).widest).toBe(42);
    expect(measureText('abc', mono).widest).toBeCloseTo(46.8);
    expect(
      measureText('abc', { ...body, weight: font.weight.bold }).widest
    ).toBeCloseTo(emWidth('abc', font.tracking.none) * 28);
  });

  it.each([
    'a\nb',
    'a\r\n\r\nb',
    'a \u2028 b',
    'a\u2029b',
    'a\tb',
    'a    b',
    ' a b ',
  ])('collapses whitespace in %j to one space', (text) => {
    expect(measureText(text, body)).toEqual(measureText('a b', body));
  });

  it('keeps a no-break space as a glyph', () => {
    expect(measureText('a\u00a0\u00a0b', body).widest).toBe(4 * 14);
  });

  it('breaks a word too wide for any line between glyphs, as `overflow-wrap: anywhere` does', () => {
    expect(measureText(long, body, 1400)).toEqual({ lines: 1, widest: 1400 });
    expect(measureText(long, body, 1399).lines).toBe(2);
    expect(measureText(long, body, 280)).toEqual({ lines: 5, widest: 280 });
    expect(measureText(`ab ${long}`, body, 280).lines).toBe(6);
    expect(proseLines(long, 20, 999)).toBe(2);
    expect(monoLines(long, 20, 1199)).toBe(2);
    expect(
      wrappedLines(
        long,
        20,
        emWidth(long, font.tracking.none) * 10 + 0.5,
        font.tracking.none
      )
    ).toBe(2);
  });

  it('puts one glyph on each line at zero width, and no line for no text', () => {
    expect(measureText('abc de', body, 0).lines).toBe(5);
    expect(measureText(' \n ', body)).toEqual({ lines: 0, widest: 0 });
    expect(proseLines('', 20, 0)).toBe(1);
  });
});

describe('measureText against takumi', () => {
  const takumi = createTakumiImageBackend({ fonts: slideFonts });

  /** The drawn box of `text` set in `role`, shrink-wrapped inside `width`. */
  const drawn = async (text: string, role: TypeRole, width: number) => {
    const box = await takumi.measure({
      element: createElement(
        'div',
        { className: 'room' },
        createElement('div', { className: 'text' }, text)
      ),
      css: `.room { align-items: flex-start; display: flex; flex-direction: column; font-family: Inter; overflow-wrap: anywhere; width: ${width}px; } .text { ${typeRole(role)} max-width: 100%; }`,
      width: 1920,
      height: 1080,
    });
    const [set] = box.children;
    return {
      lines: Math.round(
        (set?.height ?? 0) /
          lineBox({
            size: role.size,
            lineHeight: role.lineHeight ?? font.lineHeight.solid,
          })
      ),
      width: set?.width ?? 0,
    };
  };

  it.each([
    ['an uppercase label', 'Before the change', split.label, 1000],
    [
      'a lede across its measure',
      'Each one names a step money takes between the card and the merchant account, and we will use them on every slide after this one.',
      heading.lede,
      1300,
    ],
    ['collapsed line breaks', 'alpha\n\n\nbeta      gamma', type.body, 1000],
    ['mono', 'const total = sum(lines);', type.mono, 1000],
    [
      'a no-wrap phrase',
      'a long phrase',
      { ...type.body, whiteSpace: font.whiteSpace.nowrap },
      50,
    ],
  ] as const)('%s', async (_name, text, role, width) => {
    const measured = measureText(text, role, width);
    const actual = await drawn(text, role, width);
    expect(measured.lines).toBe(actual.lines);
    if (actual.lines === 1 && measured.widest <= width) {
      expect(measured.widest / actual.width).toBeGreaterThan(0.9);
      expect(measured.widest / actual.width).toBeLessThan(1.1);
    }
  });
});
