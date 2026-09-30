/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  MAX_INPUT_CHARACTERS,
  MAX_INPUT_DEPTH,
  MAX_INPUT_VALUES,
  overInputBudget,
} from './budget';

const nested = (depth: number): unknown => {
  let value: unknown = [];
  for (let level = 1; level < depth; level += 1) {
    value = [value];
  }
  return value;
};

describe('overInputBudget', () => {
  it('passes a depth at the limit and refuses one past it', () => {
    expect(overInputBudget(nested(MAX_INPUT_DEPTH))).toBeUndefined();
    expect(overInputBudget(nested(MAX_INPUT_DEPTH + 1))).toMatch(/deeper/);
  });

  it('passes a value count at the limit and refuses one past it', () => {
    const leaves = (count: number) => Array.from({ length: count }, () => 0);
    expect(overInputBudget(leaves(MAX_INPUT_VALUES - 1))).toBeUndefined();
    expect(overInputBudget(leaves(MAX_INPUT_VALUES))).toMatch(/values/);
  });

  it.each([
    ['a string', (length: number) => ['x'.repeat(length)]],
    ['a key', (length: number) => ({ ['k'.repeat(length)]: '' })],
    ['a printed leaf', (length: number) => ['x'.repeat(length - 4), true]],
  ])(
    'passes %s at the character limit and refuses one past it',
    (_label, build) => {
      expect(overInputBudget(build(MAX_INPUT_CHARACTERS))).toBeUndefined();
      expect(overInputBudget(build(MAX_INPUT_CHARACTERS + 1))).toMatch(
        /characters/
      );
    }
  );

  it('refuses a cycle', () => {
    const cycle: unknown[] = [];
    cycle.push({ inner: [cycle] });
    expect(overInputBudget(cycle)).toBe('The input contains itself.');
  });

  it('passes a reference repeated beside itself', () => {
    const shared = { type: 'x' };
    expect(overInputBudget([shared, shared])).toBeUndefined();
  });
});
