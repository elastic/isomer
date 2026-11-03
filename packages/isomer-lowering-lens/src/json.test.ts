/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyJson, JSON_LIMITS } from './json';

const refusal = (input: unknown) => {
  const result = copyJson(input);
  return result.ok ? undefined : result.message;
};

describe('copyJson', () => {
  it('copies plain JSON without sharing objects', () => {
    const input = { a: [1, 'two', null, true, { b: [] }], c: {} };
    const result = copyJson(input);
    expect(result).toEqual({ ok: true, value: input });
    if (result.ok) {
      expect(result.value).not.toBe(input);
      expect((result.value as typeof input).a).not.toBe(input.a);
    }
  });

  it('keeps a null-prototype object and an own __proto__ key as data', () => {
    const input = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(input, '__proto__', {
      value: 1,
      enumerable: true,
    });
    const result = copyJson(input);
    expect(result.ok && Object.getPrototypeOf(result.value)).toBe(
      Object.prototype
    );
    expect(result.ok && Object.keys(result.value as object)).toEqual([
      '__proto__',
    ]);
  });

  it.each([
    ['NaN', Number.NaN, 'Input holds a number that is not finite.'],
    ['Infinity', [Infinity], 'Input holds a number that is not finite.'],
    [
      'undefined in an array',
      [undefined],
      'Input holds a value of type undefined, which is not JSON.',
    ],
    ['a bigint', 1n, 'Input holds a value of type bigint, which is not JSON.'],
    [
      'a function',
      { f: () => 1 },
      'Input holds a value of type function, which is not JSON.',
    ],
    [
      'a Date',
      new Date(0),
      'Input holds an object that is not a plain object or array.',
    ],
    [
      'a Map',
      new Map(),
      'Input holds an object that is not a plain object or array.',
    ],
    [
      'a hole',
      // eslint-disable-next-line no-sparse-arrays -- the hole is the case under test.
      [1, , 3],
      'Input holds an array with holes or extra keys.',
    ],
    [
      'a symbol key',
      { [Symbol('s')]: 1 },
      'Input holds a symbol or non-enumerable key.',
    ],
  ])('refuses %s', (_name, input, message) => {
    expect(refusal(input)).toBe(message);
  });

  it('refuses an array with an extra key', () => {
    const input = Object.assign([1], { extra: 2 });
    expect(refusal(input)).toBe(
      'Input holds an array with holes or extra keys.'
    );
  });

  it('refuses accessors without calling them', () => {
    const get = vi.fn(() => 1);
    expect(
      refusal(Object.defineProperty({}, 'a', { get, enumerable: true }))
    ).toBe('Input holds an accessor property.');
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses cycles but not a shared, acyclic child', () => {
    const shared = { x: 1 };
    expect(copyJson({ a: shared, b: shared }).ok).toBe(true);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(refusal(cycle)).toBe('Input contains itself.');
  });

  it('accepts the depth limit and refuses one past it', () => {
    const nest = (depth: number): unknown =>
      depth === 0 ? 0 : [nest(depth - 1)];
    expect(copyJson(nest(JSON_LIMITS.depth)).ok).toBe(true);
    expect(refusal(nest(JSON_LIMITS.depth + 1))).toBe(
      `Input nests deeper than ${JSON_LIMITS.depth} levels.`
    );
  });

  it('accepts the value limit and refuses one past it', () => {
    // The array itself is one value.
    expect(copyJson(new Array(JSON_LIMITS.values - 1).fill(0)).ok).toBe(true);
    expect(refusal(new Array(JSON_LIMITS.values).fill(0))).toBe(
      `Input holds more than ${JSON_LIMITS.values} values.`
    );
  });

  it('drops object properties set to undefined, as JSON.stringify does', () => {
    expect(copyJson({ a: undefined, b: 1 })).toEqual({
      ok: true,
      value: { b: 1 },
    });
    const result = copyJson({ a: undefined });
    expect(result.ok && Object.keys(result.value as object)).toEqual([]);
  });

  it('counts object keys but not array indexes as characters', () => {
    // 3,600,000 characters of strings; their indexes alone would add about 490,000 more.
    expect(copyJson(new Array(100_000).fill('x'.repeat(36))).ok).toBe(true);
    const key = 'k'.repeat(JSON_LIMITS.characters - 9);
    expect(copyJson({ [key]: 'v'.repeat(9) }).ok).toBe(true);
    expect(refusal({ [key]: 'v'.repeat(10) })).toBe(
      `Input holds more than ${JSON_LIMITS.characters} characters.`
    );
  });

  it('accepts the character limit and refuses one past it', () => {
    expect(copyJson('x'.repeat(JSON_LIMITS.characters)).ok).toBe(true);
    expect(refusal('x'.repeat(JSON_LIMITS.characters + 1))).toBe(
      `Input holds more than ${JSON_LIMITS.characters} characters.`
    );
  });
});
