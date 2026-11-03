/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonLimits } from './json';
import { copyPlain, JSON_LIMITS } from './json';

const refusal = (input: unknown, limits: JsonLimits = JSON_LIMITS) => {
  const result = copyPlain(input, limits);
  return result.ok ? undefined : result.message;
};

const small = { depth: 3, values: 5, characters: 10 };

describe('copyPlain', () => {
  it('copies plain data without sharing objects', () => {
    const input = { a: [1, 'two', null, true, { b: [] }], c: {} };
    const result = copyPlain(input);
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
    const result = copyPlain(input);
    expect(result.ok && Object.getPrototypeOf(result.value)).toBe(
      Object.prototype
    );
    expect(result.ok && Object.keys(result.value as object)).toEqual([
      '__proto__',
    ]);
  });

  it('leaves non-JSON leaves to the schemas', () => {
    expect(copyPlain([Number.NaN, Infinity, undefined, 1n])).toEqual({
      ok: true,
      value: [Number.NaN, Infinity, undefined, 1n],
    });
  });

  it.each([
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
      'an array with an extra key',
      Object.assign([1], { extra: 2 }),
      'Input holds an array with holes or extra keys.',
    ],
    ['a symbol key', { [Symbol('s')]: 1 }, 'Input holds a symbol key.'],
    [
      'a non-enumerable property',
      Object.defineProperty({}, 'a', { value: 1 }),
      'Input holds a non-enumerable property.',
    ],
  ])('refuses %s', (_name, input, message) => {
    expect(refusal(input)).toBe(message);
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
    expect(copyPlain({ a: shared, b: shared }).ok).toBe(true);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(refusal(cycle)).toBe('Input contains itself.');
  });

  it('drops object properties set to undefined, as JSON.stringify does', () => {
    expect(copyPlain({ a: undefined, b: 1 })).toEqual({
      ok: true,
      value: { b: 1 },
    });
    const result = copyPlain({ a: undefined });
    expect(result.ok && Object.keys(result.value as object)).toEqual([]);
  });

  it('copies nesting far past the call stack when the limits allow it', () => {
    let nested: unknown = 0;
    for (let index = 0; index < 100_000; index += 1) {
      nested = [nested];
    }
    expect(
      copyPlain(nested, { depth: 100_000, values: 100_001, characters: 0 }).ok
    ).toBe(true);
  });

  describe('limits', () => {
    const nest = (depth: number): unknown =>
      depth === 0 ? 0 : [nest(depth - 1)];

    it('accepts the depth limit and refuses one past it', () => {
      expect(refusal(nest(small.depth), { ...small, values: 10 })).toBe(
        undefined
      );
      expect(refusal(nest(small.depth + 1), { ...small, values: 10 })).toBe(
        'Input nests deeper than 3 levels.'
      );
    });

    it('accepts the value limit and refuses one past it', () => {
      // The array itself is one value.
      expect(refusal([1, 2, 3, 4], small)).toBe(undefined);
      expect(refusal([1, 2, 3, 4, 5], small)).toBe(
        'Input holds more than 5 values.'
      );
    });

    it('counts object keys and strings, but not array indexes, as characters', () => {
      expect(refusal(['aaaa', 'bbbbbb'], small)).toBe(undefined);
      expect(refusal({ key: 'abcdefg' }, small)).toBe(undefined);
      expect(refusal({ key: 'abcdefgh' }, small)).toBe(
        'Input holds more than 10 characters.'
      );
    });

    it('defaults to JSON_LIMITS', () => {
      expect(copyPlain('x'.repeat(JSON_LIMITS.characters)).ok).toBe(true);
      expect(refusal('x'.repeat(JSON_LIMITS.characters + 1))).toBe(
        `Input holds more than ${JSON_LIMITS.characters} characters.`
      );
      expect(copyPlain(nest(JSON_LIMITS.depth)).ok).toBe(true);
      expect(refusal(nest(JSON_LIMITS.depth + 1))).toBe(
        `Input nests deeper than ${JSON_LIMITS.depth} levels.`
      );
    });
  });
});
