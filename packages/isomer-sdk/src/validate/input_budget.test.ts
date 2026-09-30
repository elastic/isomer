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

const message = (value: unknown, budget?: InputBudget) =>
  checkInputBudget(value, budget)?.message;

describe('checkInputBudget', () => {
  it('passes a depth at the limit and refuses one past it', () => {
    expect(checkInputBudget(nested(MAX_INPUT_DEPTH))).toBeUndefined();
    expect(checkInputBudget(nested(MAX_INPUT_DEPTH + 1))).toEqual({
      path: '',
      message: `input nests deeper than ${MAX_INPUT_DEPTH} levels`,
      code: 'INPUT_OVER_BUDGET',
    });
  });

  it('passes a value count at the limit and refuses one past it', () => {
    expect(checkInputBudget(leaves(MAX_INPUT_VALUES - 1))).toBeUndefined();
    expect(message(leaves(MAX_INPUT_VALUES))).toMatch(/values/);
  });

  it.each([
    ['a string', (length: number) => ['x'.repeat(length)]],
    ['a key', (length: number) => ({ ['k'.repeat(length)]: '' })],
    ['a printed leaf', (length: number) => ['x'.repeat(length - 4), true]],
  ])(
    'passes %s at the character limit and refuses one past it',
    (_label, build) => {
      expect(checkInputBudget(build(MAX_INPUT_CHARACTERS))).toBeUndefined();
      expect(message(build(MAX_INPUT_CHARACTERS + 1))).toMatch(/characters/);
    }
  );

  it('takes a host override for each limit and keeps the defaults it omits', () => {
    expect(checkInputBudget(nested(65), { depth: 65 })).toBeUndefined();
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
    expect(checkInputBudget([shared, shared])).toBeUndefined();
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

  it('stops enumerating a huge record at the value limit', () => {
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
  ])('refuses %s as not plain data', (_label, build, reason) => {
    const refusal = checkInputBudget({ type: 'view', items: [build()] });
    expect(refusal?.code).toBe('INPUT_NOT_PLAIN_DATA');
    expect(refusal?.message).toMatch(reason);
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
    const refusal = checkInputBudget([Object.create(inherited)]);
    expect(refusal?.code).toBe('INPUT_NOT_PLAIN_DATA');
    expect(reads).toBe(0);
  });

  it('passes a null-prototype object and undefined fields', () => {
    const bare = Object.assign(Object.create(null) as object, { a: [1] });
    expect(checkInputBudget({ bare, missing: undefined })).toBeUndefined();
  });
});
