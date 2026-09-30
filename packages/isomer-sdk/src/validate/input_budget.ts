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

const leafLength = (value: unknown): number =>
  typeof value === 'string'
    ? value.length
    : typeof value === 'function'
      ? 0
      : String(value).length;

/**
 * Why `value` is over `budget`, or `undefined` when it fits.
 *
 * Iterative and cycle-safe, and counts each child before queuing it, so a deep, cyclic, or huge value is refused without overflowing the stack or reading past the limit.
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
      return overBudget(`input holds more than ${maxValues} values`);
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
    if (Array.isArray(current)) {
      for (
        let index = 0;
        refusal === undefined && index < current.length;
        index += 1
      ) {
        refusal = enqueue(current[index], depth + 1, 0);
      }
    } else {
      const record = current as Record<string, unknown>;
      for (const key in record) {
        if (Object.hasOwn(record, key)) {
          refusal = enqueue(record[key], depth + 1, key.length);
          if (refusal !== undefined) {
            break;
          }
        }
      }
    }
  }
  return refusal;
};
