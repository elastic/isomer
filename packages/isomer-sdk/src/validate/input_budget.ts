/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOMER_ERROR_CODES } from '../composition/error';
import type { ValidationError } from '../composition/validation_error';

/** Objects and arrays nested in one another, the input itself included. */
export const MAX_INPUT_DEPTH = 64;

/** Every object, array, and leaf counts once. */
export const MAX_INPUT_VALUES = 20_000;

/** Every object key and string, and each other leaf as `String` prints it. */
export const MAX_INPUT_CHARACTERS = 1_000_000;

/** Overrides for the limits {@link checkInputBudget} enforces; an omitted one keeps its default. */
export interface InputBudget {
  /** Defaults to {@link MAX_INPUT_DEPTH}. */
  depth?: number;
  /** Defaults to {@link MAX_INPUT_VALUES}. */
  values?: number;
  /** Defaults to {@link MAX_INPUT_CHARACTERS}. */
  characters?: number;
}

/** The codes {@link checkInputBudget} refuses with. */
export const INPUT_REFUSAL_CODES: ReadonlySet<string | undefined> = new Set([
  ISOMER_ERROR_CODES.INPUT_NOT_PLAIN_DATA,
  ISOMER_ERROR_CODES.INPUT_OVER_BUDGET,
]);

interface Entry {
  value: object;
  depth: number;
  leave?: true;
}

const overBudget = (message: string): ValidationError => ({
  path: '',
  message,
  code: ISOMER_ERROR_CODES.INPUT_OVER_BUDGET,
});

const notPlainData = (what: string): ValidationError => ({
  path: '',
  message: `input holds ${what}, which is not plain data`,
  code: ISOMER_ERROR_CODES.INPUT_NOT_PLAIN_DATA,
});

const leafLength = (value: unknown): number =>
  typeof value === 'string' ? value.length : String(value).length;

/**
 * Why `value` is over `budget` or is not plain data, or `undefined` when it is neither.
 *
 * Plain data is what the schema reads exactly as walked: arrays without holes, objects whose prototype is `Object.prototype` or `null`, and only enumerable own data properties with string keys.
 * Iterative and cycle-safe. Its cost is linear in the input's size: it lists a container's own keys, then refuses past the value limit before reading any of them, so nothing is visited twice and the stack never grows.
 */
export const checkInputBudget = (
  value: unknown,
  budget: InputBudget = {}
): ValidationError | undefined => {
  const {
    depth: maxDepth = MAX_INPUT_DEPTH,
    values: maxValues = MAX_INPUT_VALUES,
    characters: maxCharacters = MAX_INPUT_CHARACTERS,
  } = budget;
  const tooManyValues = overBudget(`input holds more than ${maxValues} values`);
  const ancestors = new Set<object>();
  const stack: Entry[] = [];
  let values = 0;
  let characters = 0;
  const enqueue = (
    child: unknown,
    depth: number,
    keyLength: number
  ): ValidationError | undefined => {
    values += 1;
    if (values > maxValues) {
      return tooManyValues;
    }
    if (typeof child === 'function') {
      return notPlainData('a function');
    }
    if (typeof child === 'object' && child !== null) {
      stack.push({ value: child, depth });
      characters += keyLength;
    } else {
      characters += keyLength + leafLength(child);
    }
    return characters > maxCharacters
      ? overBudget(`input holds more than ${maxCharacters} characters`)
      : undefined;
  };
  const enqueueChildren = (
    container: object,
    depth: number
  ): ValidationError | undefined => {
    const isArray = Array.isArray(container);
    const prototype = isArray ? null : Reflect.getPrototypeOf(container);
    if (prototype !== Object.prototype && prototype !== null) {
      return notPlainData('an object that is not a plain object or array');
    }
    const keys = isArray ? undefined : Reflect.ownKeys(container);
    const count = keys?.length ?? (container as unknown[]).length;
    if (values + count > maxValues) {
      return tooManyValues;
    }
    for (let index = 0; index < count; index += 1) {
      const key = keys === undefined ? index : keys[index]!;
      if (typeof key === 'symbol') {
        return notPlainData('a symbol key');
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(container, key);
      const refusal =
        descriptor === undefined
          ? notPlainData('an array hole')
          : !('value' in descriptor)
            ? notPlainData('an accessor property')
            : !descriptor.enumerable
              ? notPlainData('a non-enumerable property')
              : enqueue(
                  descriptor.value,
                  depth,
                  typeof key === 'string' ? key.length : 0
                );
      if (refusal !== undefined) {
        return refusal;
      }
    }
    return undefined;
  };
  let refusal = enqueue(value, 1, 0);
  while (refusal === undefined && stack.length > 0) {
    const { value: current, depth, leave } = stack.pop()!;
    if (leave) {
      ancestors.delete(current);
      continue;
    }
    if (ancestors.has(current)) {
      return overBudget('input contains itself');
    }
    if (depth > maxDepth) {
      return overBudget(`input nests deeper than ${maxDepth} levels`);
    }
    ancestors.add(current);
    stack.push({ value: current, depth, leave: true });
    refusal = enqueueChildren(current, depth + 1);
  }
  return refusal;
};
