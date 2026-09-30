/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { font } from '../theme/base';
import { frameContentWidth } from '../theme/components/frame';
import { heading } from '../theme/components/heading';
import { scalePx } from '../theme/scale';

import {
  emWidth,
  rowLoad,
  sizeForLines,
  sizeForLoad,
  sizeForWidthLoad,
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

describe('sizeForWidthLoad', () => {
  const budget = { l: 100, m: 200 };
  const at = (width: number, crowding = 1) => ({ width, crowding });
  const half = (frameContentWidth - 64) / 2 + 64;

  it('reads a layout as wide as the frame as sizeForLoad does', () => {
    expect(
      sizeForWidthLoad(undefined, 100, budget, at(frameContentWidth))
    ).toBe('l');
    expect(
      sizeForWidthLoad(undefined, 101, budget, at(frameContentWidth))
    ).toBe('m');
    expect(
      sizeForWidthLoad(undefined, 100, budget, at(frameContentWidth, 2))
    ).toBe('m');
  });

  it('weighs the load by how much narrower the layout is, less its gutters', () => {
    expect(sizeForWidthLoad(undefined, 50, budget, at(half), 64)).toBe('l');
    expect(sizeForWidthLoad(undefined, 51, budget, at(half), 64)).toBe('m');
    expect(sizeForWidthLoad(undefined, 51, budget, at(half))).toBe('l');
  });

  it('takes `s` when the gutters leave no width, and keeps an explicit size', () => {
    expect(sizeForWidthLoad(undefined, 1, budget, at(64), 64)).toBe('s');
    expect(sizeForWidthLoad(undefined, 1, budget, at(0))).toBe('s');
    expect(sizeForWidthLoad('l', 1000, budget, at(0, 3))).toBe('l');
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
