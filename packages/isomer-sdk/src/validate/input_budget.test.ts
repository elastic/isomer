/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  checkInputBudget,
  type InputBudget,
  isInputRefusal,
  MAX_INPUT_CHARACTERS,
  MAX_INPUT_DEPTH,
  MAX_INPUT_VALUES,
} from './input_budget';

const nested = (depth: number): unknown => {
  let value: unknown = [];
  for (let level = 1; level < depth; level += 1) {
    value = [value];
  }
  return value;
};

const leaves = (count: number) => Array.from({ length: count }, () => 0);

const refusal = (value: unknown, budget?: InputBudget) => {
  const checked = checkInputBudget(value, budget);
  return checked.valid ? undefined : checked.error;
};

const message = (value: unknown, budget?: InputBudget) =>
  refusal(value, budget)?.message;

describe('checkInputBudget', () => {
  it('passes a depth at the limit and refuses one past it', () => {
    expect(refusal(nested(MAX_INPUT_DEPTH))).toBeUndefined();
    expect(refusal(nested(MAX_INPUT_DEPTH + 1))).toEqual({
      path: '',
      message: `input nests deeper than ${MAX_INPUT_DEPTH} levels`,
      code: 'INPUT_OVER_BUDGET',
    });
  });

  it('passes a value count at the limit and refuses one past it', () => {
    expect(refusal(leaves(MAX_INPUT_VALUES - 1))).toBeUndefined();
    expect(message(leaves(MAX_INPUT_VALUES))).toMatch(/values/);
  });

  it.each([
    ['a string', (length: number) => ['x'.repeat(length)]],
    ['a key', (length: number) => ({ ['k'.repeat(length)]: '' })],
    ['a printed leaf', (length: number) => ['x'.repeat(length - 4), true]],
  ])(
    'passes %s at the character limit and refuses one past it',
    (_label, build) => {
      expect(refusal(build(MAX_INPUT_CHARACTERS))).toBeUndefined();
      expect(message(build(MAX_INPUT_CHARACTERS + 1))).toMatch(/characters/);
    }
  );

  it('takes a host override for each limit and keeps the defaults it omits', () => {
    expect(refusal(nested(65), { depth: 65 })).toBeUndefined();
    expect(message(nested(3), { depth: 2 })).toMatch(/deeper than 2/);
    expect(message(leaves(3), { values: 3 })).toMatch(/more than 3 values/);
    expect(message(['abcd'], { characters: 3 })).toMatch(/3 characters/);
    expect(message(nested(MAX_INPUT_DEPTH + 1), {})).toMatch(/deeper/);
  });

  it('refuses a cycle and passes a reference repeated beside itself', () => {
    const cycle: unknown[] = [];
    cycle.push({ inner: [cycle] });
    expect(message(cycle)).toBe('input contains itself');
    const shared = { type: 'x' };
    expect(refusal([shared, shared])).toBeUndefined();
  });

  it('refuses a 100,000-deep nesting without overflowing the stack', () => {
    expect(message(nested(100_000))).toMatch(/deeper/);
  });

  it('stops a 5,000,000-element array at the value limit', () => {
    let reads = 0;
    const huge = new Proxy(new Array<unknown>(5_000_000), {
      get: (target, key, receiver) => {
        if (typeof key === 'string' && /^\d+$/.test(key)) {
          reads += 1;
        }
        return Reflect.get(target, key, receiver) as unknown;
      },
    });
    expect(message(huge)).toMatch(/values/);
    expect(reads).toBeLessThanOrEqual(MAX_INPUT_VALUES);
  });

  it('reads no more of a huge record than the value limit', () => {
    const keys = Array.from({ length: 200_000 }, (_, index) => `k${index}`);
    let visited = 0;
    const huge = new Proxy(
      {},
      {
        ownKeys: () => keys,
        getOwnPropertyDescriptor: () => {
          visited += 1;
          return { value: 0, enumerable: true, configurable: true };
        },
        get: () => 0,
      }
    );
    expect(message(huge)).toMatch(/values/);
    expect(visited).toBeLessThanOrEqual(MAX_INPUT_VALUES);
  });

  const deepBody = { body: nested(100_000) };

  it.each([
    [
      'an inherited field',
      () => Object.create(deepBody) as unknown,
      /plain object/,
    ],
    [
      'a non-enumerable field',
      () => Object.defineProperty({}, 'body', { value: deepBody.body }),
      /non-enumerable/,
    ],
    [
      'a getter',
      () => ({
        get body() {
          return deepBody.body;
        },
      }),
      /accessor/,
    ],
    [
      'a class instance',
      () =>
        new (class {
          body = 1;
        })(),
      /plain object/,
    ],
    ['a symbol key', () => ({ [Symbol.for('body')]: 1 }), /symbol key/],
    ['a function', () => ({ render: () => null }), /a function/],
    [
      'an array hole',
      () => Object.assign(new Array<number>(3), { 0: 1, 2: 2 }),
      /array hole/,
    ],
    ['a Map', () => new Map(), /plain object/],
    [
      'a getter on an array index',
      () =>
        Object.defineProperty([0], 0, {
          get: () => deepBody.body,
          enumerable: true,
        }),
      /accessor/,
    ],
  ])('refuses %s as not plain data', (_label, build, reason) => {
    const found = refusal({ type: 'view', items: [build()] });
    expect(found?.code).toBe('INPUT_NOT_PLAIN_DATA');
    expect(found?.message).toMatch(reason);
  });

  it('refuses a huge inherited key set without enumerating it', () => {
    const keys = Array.from({ length: 200_000 }, (_, index) => `k${index}`);
    let reads = 0;
    const inherited = new Proxy(
      {},
      {
        ownKeys: () => {
          reads += 1;
          return keys;
        },
        getOwnPropertyDescriptor: () => {
          reads += 1;
          return { value: 0, enumerable: true, configurable: true };
        },
      }
    );
    const found = refusal([Object.create(inherited)]);
    expect(found?.code).toBe('INPUT_NOT_PLAIN_DATA');
    expect(reads).toBe(0);
  });

  it('passes a null-prototype object and undefined fields', () => {
    const bare = Object.assign(Object.create(null) as object, { a: [1] });
    expect(refusal({ bare, missing: undefined })).toBeUndefined();
  });
});

describe('the plain copy', () => {
  const copyOf = (value: unknown): unknown => {
    const checked = checkInputBudget(value);
    if (!checked.valid) {
      throw new Error(checked.error.message);
    }
    return checked.value;
  };

  it('copies every container and keeps leaves and null prototypes', () => {
    const bare = Object.assign(Object.create(null) as object, { a: 1 });
    const input = { type: 'view', body: [{ type: 'x', bare, list: [1, 'a'] }] };
    const copy = copyOf(input) as typeof input;
    expect(copy).toEqual(input);
    expect(copy).not.toBe(input);
    expect(copy.body[0]).not.toBe(input.body[0]);
    expect(Object.getPrototypeOf(copy.body[0]!.bare)).toBeNull();
  });

  it('copies a `__proto__` key as a field, not a prototype', () => {
    const copy = copyOf(JSON.parse('{"__proto__":{"deep":1}}')) as object;
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.keys(copy)).toEqual(['__proto__']);
  });

  it('leaves out an array’s other own properties', () => {
    const list = Object.assign([1], { body: nested(100_000) });
    expect(copyOf(list)).toEqual([1]);
    expect(Object.keys(copyOf(list) as object)).toEqual(['0']);
  });

  it("reads through descriptors, so a proxy's `get` cannot hand the parser something else", () => {
    const shifty = new Proxy(
      { items: [] as unknown },
      { get: () => nested(100_000) }
    );
    expect(copyOf({ node: shifty })).toEqual({ node: { items: [] } });
  });
});

describe('isInputRefusal', () => {
  it('is true for each code checkInputBudget refuses with, and no other', () => {
    expect(isInputRefusal({ code: 'INPUT_OVER_BUDGET' })).toBe(true);
    expect(isInputRefusal({ code: 'INPUT_NOT_PLAIN_DATA' })).toBe(true);
    expect(isInputRefusal({ code: 'COMPOSITION_INVALID' })).toBe(false);
    expect(isInputRefusal({})).toBe(false);
  });
});
