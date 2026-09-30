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
  emWidth,
  rowLoad,
  sizeForLines,
  sizeForLoad,
  widestWord,
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
