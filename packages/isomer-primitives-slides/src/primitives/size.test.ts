/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { font } from '../theme/base';
import { heading } from '../theme/components/heading';
import { scalePx } from '../theme/scale';

import {
  brokenLines,
  emWidth,
  lineFill,
  markedLines,
  monoWidth,
  packedLines,
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

  it('counts a line break or a tab as the space it draws', () => {
    expect(rowLoad([['a\nb\tc']])).toBe(rowLoad([['a b c']]));
    expect(rowLoad([['a\nb\tc']])).toBe(5);
  });
});

describe('monoWidth', () => {
  it('measures a line break or a tab as the space it draws', () => {
    const size = font.size.px26;
    expect(monoWidth('a\nb\r\nc\td', size)).toBe(monoWidth('a b c d', size));
    expect(monoWidth('a\nb', size)).toBeGreaterThan(monoWidth('ab', size));
  });
});

describe('packedLines', () => {
  it('sets an item wider than the line on a line of its own', () => {
    expect(packedLines([40, 250, 40], 10, 100)).toBe(3);
  });

  it('runs an item wider than `breakAt` across the lines it fills', () => {
    expect(packedLines([250], 10, 100, 100)).toBe(3);
    expect(packedLines([40, 250, 40], 10, 100, 100)).toBe(4);
    expect(packedLines([40, 250, 50], 10, 100, 100)).toBe(5);
  });

  it('breaks nothing between the line and `breakAt`', () => {
    expect(packedLines([95, 95], 0, 92, 100)).toBe(2);
    expect(packedLines([101], 0, 92, 100)).toBe(2);
  });
});

describe('brokenLines', () => {
  const tracking = font.tracking.snug;
  const word = 'Internationalization';
  // The column the word fills twice over, once packed to `lineFill`.
  const column = (emWidth(word, tracking) * 40) / (2 * lineFill);

  it('counts the lines a word wider than its column breaks across', () => {
    expect(wrappedLines(word, 40, (column + 1) * lineFill, tracking)).toBe(1);
    expect(brokenLines(word, 40, column + 1, tracking)).toBe(2);
    expect(brokenLines(word, 40, column - 1, tracking)).toBe(3);
  });

  it('holds a word that fits on one line', () => {
    expect(brokenLines(word, 40, 2 * column + 1, tracking)).toBe(1);
  });
});

describe('markedLines', () => {
  const call = 'x'.repeat(17);

  it('counts prose as proseLines does', () => {
    const text = 'Match the order, the amount, and the card on file';
    expect(markedLines(text, 26, 300)).toBe(
      proseLines(text, 26, 300 * lineFill)
    );
  });

  // Seventeen mono columns fit the line; the chip's padding and border tip them over it.
  it('sets a `code` run in the mono face, inside its chip', () => {
    const fill = 300 * lineFill;
    const mono = monoWidth(call, font.size.px26);
    expect(mono).toBeLessThanOrEqual(fill);
    expect(markedLines(call, 26, 300)).toBe(1);
    expect(markedLines(`\`${call}\``, 26, 300)).toBe(2);
    expect(markedLines(`\`${call.slice(1)}\``, 26, 300)).toBe(1);
  });

  it('breaks a word wider than the column across the lines it fills', () => {
    expect(markedLines('x'.repeat(80), 26, 300)).toBe(4);
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
