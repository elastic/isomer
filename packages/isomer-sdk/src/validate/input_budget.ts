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
  /** Defaults to {@link MAX_INPUT_DEPTH}. Zod parses what passes recursively, so a few hundred nested containers can exhaust the call stack. */
  depth?: number;
  /** Defaults to {@link MAX_INPUT_VALUES}. */
  values?: number;
  /** Defaults to {@link MAX_INPUT_CHARACTERS}. */
  characters?: number;
}

/** The codes {@link checkInputBudget} refuses with. */
const INPUT_REFUSAL_CODES: ReadonlySet<string | undefined> = new Set([
  ISOMER_ERROR_CODES.INPUT_NOT_PLAIN_DATA,
  ISOMER_ERROR_CODES.INPUT_OVER_BUDGET,
]);

/** Whether `error` is a refusal before parsing, which no validation mode collects. */
export const isInputRefusal = ({
  code,
}: Pick<ValidationError, 'code'>): boolean => INPUT_REFUSAL_CODES.has(code);

/** A plain copy of the input to parse in its place, or why there is none. */
export type InputBudgetCheck =
  { valid: true; value: unknown } | { valid: false; error: ValidationError };

type PlainContainer = unknown[] | Record<string, unknown>;

interface Entry {
  source: object;
  copy: PlainContainer;
  depth: number;
  leave?: true;
}

class Refusal extends Error {
  constructor(readonly error: ValidationError) {
    super(error.message);
  }
}

const overBudget = (message: string): Refusal =>
  new Refusal({
    path: '',
    message,
    code: ISOMER_ERROR_CODES.INPUT_OVER_BUDGET,
  });

const notPlainData = (what: string): Refusal =>
  new Refusal({
    path: '',
    message: `input holds ${what}, which is not plain data`,
    code: ISOMER_ERROR_CODES.INPUT_NOT_PLAIN_DATA,
  });

const leafLength = (value: unknown): number =>
  typeof value === 'string' ? value.length : String(value).length;

/** Reads `key` once, through its descriptor. */
const plainProperty = (source: object, key: string | number): unknown => {
  const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) {
    throw notPlainData('an array hole');
  }
  if (!('value' in descriptor)) {
    throw notPlainData('an accessor property');
  }
  if (!descriptor.enumerable) {
    throw notPlainData('a non-enumerable property');
  }
  return descriptor.value;
};

/**
 * A plain copy of `value` within `budget`, or why there is none: it is over `budget` or is not plain data.
 *
 * Plain data is arrays without holes, objects whose prototype is `Object.prototype` or `null`, enumerable own data properties with string keys, and primitives other than functions.
 * Each property is read once, so a caller that parses the copy parses exactly what was checked; an array's other own properties are left out.
 * Iterative and cycle-safe. Its cost is linear in the input's size: it lists a container's own keys, then refuses past the value limit before reading any of them.
 */
export const checkInputBudget = (
  value: unknown,
  budget: InputBudget = {}
): InputBudgetCheck => {
  const {
    depth: maxDepth = MAX_INPUT_DEPTH,
    values: maxValues = MAX_INPUT_VALUES,
    characters: maxCharacters = MAX_INPUT_CHARACTERS,
  } = budget;
  const tooManyValues = `input holds more than ${maxValues} values`;
  const ancestors = new Set<object>();
  const stack: Entry[] = [];
  let values = 0;
  let characters = 0;
  const countCharacters = (count: number): void => {
    characters += count;
    if (characters > maxCharacters) {
      throw overBudget(`input holds more than ${maxCharacters} characters`);
    }
  };
  const enqueue = (
    child: unknown,
    depth: number,
    keyLength: number
  ): unknown => {
    values += 1;
    if (values > maxValues) {
      throw overBudget(tooManyValues);
    }
    if (typeof child === 'function') {
      throw notPlainData('a function');
    }
    if (typeof child !== 'object' || child === null) {
      countCharacters(keyLength + leafLength(child));
      return child;
    }
    let copy: PlainContainer = [];
    if (!Array.isArray(child)) {
      const prototype = Reflect.getPrototypeOf(child);
      if (prototype !== Object.prototype && prototype !== null) {
        throw notPlainData('an object that is not a plain object or array');
      }
      copy = Object.create(prototype) as Record<string, unknown>;
    }
    countCharacters(keyLength);
    stack.push({ source: child, copy, depth });
    return copy;
  };
  const copyChildren = ({ source, copy, depth }: Entry): void => {
    const keys = Array.isArray(copy) ? undefined : Reflect.ownKeys(source);
    const count = keys?.length ?? (source as unknown[]).length;
    if (values + count > maxValues) {
      throw overBudget(tooManyValues);
    }
    for (let index = 0; index < count; index += 1) {
      const key = keys === undefined ? index : keys[index]!;
      if (typeof key === 'symbol') {
        throw notPlainData('a symbol key');
      }
      const child = plainProperty(source, key);
      if (Array.isArray(copy)) {
        copy.push(enqueue(child, depth, 0));
      } else {
        Object.defineProperty(copy, key, {
          value: enqueue(child, depth, String(key).length),
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
  };
  try {
    const root = enqueue(value, 1, 0);
    while (stack.length > 0) {
      const entry = stack.pop()!;
      const { source, depth, leave } = entry;
      if (leave) {
        ancestors.delete(source);
      } else if (ancestors.has(source)) {
        throw overBudget('input contains itself');
      } else if (depth > maxDepth) {
        throw overBudget(`input nests deeper than ${maxDepth} levels`);
      } else {
        ancestors.add(source);
        stack.push({ ...entry, leave: true });
        copyChildren({ ...entry, depth: depth + 1 });
      }
    }
    return { valid: true, value: root };
  } catch (error) {
    if (error instanceof Refusal) {
      return { valid: false, error: error.error };
    }
    throw error;
  }
};
