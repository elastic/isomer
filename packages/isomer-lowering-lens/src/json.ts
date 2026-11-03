/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A value `JSON.parse` can return. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** A JSON object, such as a saved filter or a column's `params`. */
export type JsonObject = { [key: string]: JsonValue };

/** Whether a value read from validated JSON is an object, not an array or a leaf. */
export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Limits on one `plan` or `readResponse` argument, counted across the whole value. */
export const JSON_LIMITS = {
  depth: 32,
  values: 200_000,
  characters: 4_000_000,
} as const;

/** Limits {@link copyPlain} enforces; {@link JSON_LIMITS} unless a caller narrows them. */
export type JsonLimits = { readonly [Key in keyof typeof JSON_LIMITS]: number };

type Copied = { ok: true; value: unknown } | { ok: false; message: string };

type Container = unknown[] | Record<string, unknown>;

interface Entry {
  source: object;
  copy: Container;
  depth: number;
  leave?: true;
}

class Refusal extends Error {}

/** Reads `key` once, through its descriptor, so an accessor or proxy trap never runs. */
const plainProperty = (source: object, key: string | number): unknown => {
  const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) {
    throw new Refusal('holds an array with holes');
  }
  if (!('value' in descriptor)) {
    throw new Refusal('holds an accessor property');
  }
  if (!descriptor.enumerable) {
    throw new Refusal('holds a non-enumerable property');
  }
  return descriptor.value;
};

/**
 * A copy of `input` that shares nothing with it, or why there is none: it is over `limits`, cyclic, or not plain data.
 * Plain data is arrays without holes or extra keys, objects whose prototype is `Object.prototype` or `null`, and enumerable own data properties with string keys.
 * Leaves are copied as they are, so callers check JSON-ness with the schemas' `json`; an object property set to `undefined` is dropped, as `JSON.stringify` drops it.
 * Iterative, like the SDK's `checkInputBudget`, so nesting cannot exhaust the stack.
 */
export const copyPlain = (
  input: unknown,
  limits: JsonLimits = JSON_LIMITS
): Copied => {
  const ancestors = new Set<object>();
  const stack: Entry[] = [];
  let values = 0;
  let characters = 0;
  const countCharacters = (count: number) => {
    characters += count;
    if (characters > limits.characters) {
      throw new Refusal(`holds more than ${limits.characters} characters`);
    }
  };
  const enqueue = (child: unknown, depth: number): unknown => {
    values += 1;
    if (values > limits.values) {
      throw new Refusal(`holds more than ${limits.values} values`);
    }
    if (typeof child === 'string') {
      countCharacters(child.length);
    }
    if (typeof child !== 'object' || child === null) {
      return child;
    }
    let copy: Container = [];
    if (Array.isArray(child)) {
      if (Reflect.getPrototypeOf(child) !== Array.prototype) {
        throw new Refusal('holds an array that is not a plain array');
      }
    } else {
      const prototype = Reflect.getPrototypeOf(child);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Refusal(
          'holds an object that is not a plain object or array'
        );
      }
      copy = {};
    }
    stack.push({ source: child, copy, depth });
    return copy;
  };
  const copyChildren = ({ source, copy, depth }: Entry) => {
    if (Array.isArray(copy)) {
      const { length } = source as unknown[];
      if (Reflect.ownKeys(source).length !== length + 1) {
        throw new Refusal('holds an array with holes or extra keys');
      }
      for (let index = 0; index < length; index += 1) {
        copy.push(enqueue(plainProperty(source, index), depth));
      }
      return;
    }
    for (const key of Reflect.ownKeys(source)) {
      if (typeof key === 'symbol') {
        throw new Refusal('holds a symbol key');
      }
      const value = plainProperty(source, key);
      if (value === undefined) {
        continue;
      }
      countCharacters(key.length);
      Object.defineProperty(copy, key, {
        value: enqueue(value, depth),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  };
  try {
    const root = enqueue(input, 1);
    while (stack.length > 0) {
      const entry = stack.pop()!;
      const { source, depth, leave } = entry;
      if (leave) {
        ancestors.delete(source);
      } else if (ancestors.has(source)) {
        throw new Refusal('contains itself');
      } else if (depth > limits.depth) {
        throw new Refusal(`nests deeper than ${limits.depth} levels`);
      } else {
        ancestors.add(source);
        stack.push({ ...entry, leave: true });
        copyChildren({ ...entry, depth: depth + 1 });
      }
    }
    return { ok: true, value: root };
  } catch (error) {
    if (error instanceof Refusal) {
      return { ok: false, message: `Input ${error.message}.` };
    }
    throw error;
  }
};
