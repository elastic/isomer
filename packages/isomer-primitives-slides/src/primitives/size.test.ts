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
  measureMarks,
  measureText,
  monoLines,
  proseLines,
  rowLoad,
  sizeForLines,
  sizeForLoad,
  sizeForWidth,
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

describe('sizeForWidth', () => {
  const role = { weight: font.weight.extrabold, tracking: font.tracking.none };
  const width = (text: string, step: keyof typeof steps) =>
    measureText(text, { ...role, size: steps[step] }).widest;

  it('takes the largest step at which the text fits on one line', () => {
    expect(sizeForWidth(undefined, '000', role, width('000', 'l'), steps)).toBe(
      'l'
    );
    expect(
      sizeForWidth(undefined, '000', role, width('000', 'l') - 1, steps)
    ).toBe('m');
    expect(
      sizeForWidth(undefined, '000', role, width('000', 'm') - 1, steps)
    ).toBe('s');
    expect(sizeForWidth(undefined, '000', role, 0, steps)).toBe('s');
  });

  it('measures a phrase on one line, spaces included', () => {
    expect(
      sizeForWidth(undefined, '1 000', role, width('1 000', 'l') - 1, steps)
    ).toBe('m');
  });

  it('keeps an explicit size', () => {
    expect(sizeForWidth('l', '000', role, 0, steps)).toBe('l');
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

describe('measureMarks', () => {
  const role: TypeRole = {
    size: font.size.px32,
    weight: font.weight.bold,
    transform: font.transform.uppercase,
  };
  const mono = { ...role, ...marks.code };
  const inset = scalePx(marks.codeInset) + scalePx(marks.codeBorder);

  it('measures a word across runs as one word, each run in its own face', () => {
    const { lines, widest } = measureMarks('`aa`bb', role, 1000);
    expect(lines).toBe(1);
    expect(widest).toBeCloseTo(
      measureText('aa', mono).widest +
        2 * inset +
        measureText('bb', role).widest
    );
  });

  it('prices each space in the face of the run it sits in', () => {
    const code = '`a b c d`';
    const { widest } = measureMarks(code, role);
    expect(widest).toBeCloseTo(measureText('a b c d', mono).widest + 2 * inset);
    expect(measureMarks(code, role, widest).lines).toBe(1);
    expect(measureMarks(code, role, widest - 1).lines).toBe(2);
  });

  it('sets code in display text in mono without its chip, and strong in the role’s weight', () => {
    expect(
      measureMarks('`aa` **bb**', role, Infinity, 'primary').widest
    ).toBeCloseTo(
      measureText('aa', { ...role, ...marks.displayCode }).widest +
        measureText('x bb', role).widest -
        measureText('x', role).widest
    );
  });

  it('sets strong in bold in body copy', () => {
    const regular = { size: font.size.px32 };
    expect(measureMarks('**bb**', regular).widest).toBe(
      measureText('bb', { ...regular, ...marks.strong }).widest
    );
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
