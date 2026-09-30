/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Objects and arrays nested in one another, the input itself included. */
export const MAX_INPUT_DEPTH = 64;

/** Every object, array, and leaf counts once. */
export const MAX_INPUT_VALUES = 20_000;

/** Every object key and string, and each other leaf as `String` prints it. */
export const MAX_INPUT_CHARACTERS = 1_000_000;

interface Entry {
  value: unknown;
  depth: number;
  leave?: true;
}

const TOO_MANY_VALUES = `The input holds more than ${MAX_INPUT_VALUES} values.`;

const TOO_MANY_CHARACTERS = `The input holds more than ${MAX_INPUT_CHARACTERS} characters.`;

/** Why `value` is over the input budget, or `undefined` when it fits. Iterative, so a deep or cyclic value cannot overflow the stack. */
export const overInputBudget = (value: unknown): string | undefined => {
  const ancestors = new Set<object>();
  const stack: Entry[] = [{ value, depth: 1 }];
  let values = 1;
  let characters = 0;
  while (stack.length > 0) {
    const { value: current, depth, leave } = stack.pop()!;
    if (typeof current !== 'object' || current === null) {
      characters +=
        typeof current === 'string' ? current.length : String(current).length;
    } else if (leave) {
      ancestors.delete(current);
      continue;
    } else if (ancestors.has(current)) {
      return 'The input contains itself.';
    } else if (depth > MAX_INPUT_DEPTH) {
      return `The input nests deeper than ${MAX_INPUT_DEPTH} levels.`;
    } else {
      const isArray = Array.isArray(current);
      const keys = Object.keys(current);
      values += keys.length;
      if (values > MAX_INPUT_VALUES) {
        return TOO_MANY_VALUES;
      }
      ancestors.add(current);
      stack.push({ value: current, depth, leave: true });
      for (const key of keys) {
        characters += isArray ? 0 : key.length;
        stack.push({
          value: (current as Record<string, unknown>)[key],
          depth: depth + 1,
        });
      }
    }
    if (characters > MAX_INPUT_CHARACTERS) {
      return TOO_MANY_CHARACTERS;
    }
  }
  return undefined;
};
