/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A view of `context` that reads `key` as `value` and everything else from
 * `context`, with methods bound to it, so getters, private state, and
 * `instanceof` behave as before. A context that is not an object is returned
 * as it is.
 */
export const contextWith = <TContext>(
  context: TContext,
  key: string | symbol,
  value: unknown
): TContext => {
  if (typeof context !== 'object' || context === null) {
    return context;
  }
  const original: object = context;
  // An extensible stand-in, so a frozen context cannot trip the proxy invariants.
  const standIn = Object.create(
    Object.getPrototypeOf(original) as object | null
  ) as object;
  return new Proxy(standIn, {
    get: (_, read) => {
      if (read === key) {
        return value;
      }
      const found: unknown = Reflect.get(original, read, original);
      return typeof found === 'function'
        ? (found as (...args: unknown[]) => unknown).bind(original)
        : found;
    },
    set: (_, write, next) => Reflect.set(original, write, next, original),
    has: (_, read) => read === key || Reflect.has(original, read),
    ownKeys: () => [...new Set([...Reflect.ownKeys(original), key])],
    getOwnPropertyDescriptor: (_, read) => {
      if (read === key) {
        return { value, enumerable: true, configurable: true, writable: true };
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(original, read);
      return descriptor && { ...descriptor, configurable: true };
    },
    getPrototypeOf: () => Object.getPrototypeOf(original) as object | null,
  }) as TContext;
};
