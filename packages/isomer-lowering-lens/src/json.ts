/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Limits on one `plan` or `readResponse` argument, counted across the whole value. */
export const JSON_LIMITS = {
  depth: 32,
  values: 200_000,
  characters: 4_000_000,
} as const;

type Copied = { ok: true; value: JsonValue } | { ok: false; message: string };

class Refusal extends Error {}

/**
 * Copies `input` if it is finite, acyclic plain JSON within {@link JSON_LIMITS}.
 * Reads own data properties only, so accessors and proxies' traps never run twice.
 */
export const copyJson = (input: unknown): Copied => {
  let values = 0;
  let characters = 0;
  const count = (length: number) => {
    values += 1;
    characters += length;
    if (values > JSON_LIMITS.values) {
      throw new Refusal(`holds more than ${JSON_LIMITS.values} values`);
    }
    if (characters > JSON_LIMITS.characters) {
      throw new Refusal(`holds more than ${JSON_LIMITS.characters} characters`);
    }
  };
  const ancestors = new Set<object>();
  const copy = (value: unknown, depth: number): JsonValue => {
    if (value === null || typeof value === 'boolean') {
      count(0);
      return value;
    }
    if (typeof value === 'string') {
      count(value.length);
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Refusal('holds a number that is not finite');
      }
      count(0);
      return value;
    }
    if (typeof value !== 'object') {
      throw new Refusal(
        `holds a value of type ${typeof value}, which is not JSON`
      );
    }
    if (depth > JSON_LIMITS.depth) {
      throw new Refusal(`nests deeper than ${JSON_LIMITS.depth} levels`);
    }
    if (ancestors.has(value)) {
      throw new Refusal('contains itself');
    }
    const isArray = Array.isArray(value);
    const prototype: unknown = Reflect.getPrototypeOf(value);
    if (
      isArray
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    ) {
      throw new Refusal('holds an object that is not a plain object or array');
    }
    count(0);
    ancestors.add(value);
    const keys = Reflect.ownKeys(value).filter(
      (key) => !(isArray && key === 'length')
    );
    const result: JsonValue[] | JsonObject = isArray ? [] : {};
    for (const key of keys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (typeof key === 'symbol' || !descriptor?.enumerable) {
        throw new Refusal('holds a symbol or non-enumerable key');
      }
      if (isArray && key !== String((result as JsonValue[]).length)) {
        throw new Refusal('holds an array with holes or extra keys');
      }
      if (!('value' in descriptor)) {
        throw new Refusal('holds an accessor property');
      }
      characters += key.length;
      const child = copy(descriptor.value, depth + 1);
      if (isArray) {
        (result as JsonValue[]).push(child);
      } else {
        Object.defineProperty(result, key, {
          value: child,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
    if (isArray && result.length !== (value as unknown[]).length) {
      throw new Refusal('holds an array with holes or extra keys');
    }
    ancestors.delete(value);
    return result;
  };
  try {
    return { ok: true, value: copy(input, 1) };
  } catch (error) {
    if (error instanceof Refusal) {
      return { ok: false, message: `Input ${error.message}.` };
    }
    throw error;
  }
};
