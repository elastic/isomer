/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Whether `value` can carry properties: a non-null object or a function. */
export const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

/**
 * A view of `context` that reads `key` as `value` and everything else from
 * `context`, with methods bound to it once, so getters, private state,
 * `instanceof` and each method's identity behave as before, and a callable
 * context stays callable. For a container giving a child its own field, such
 * as a size. A context that is neither an object nor a function is returned
 * as it is.
 */
export const contextWith = <TContext>(
  context: TContext,
  key: string | symbol,
  value: unknown
): TContext => {
  if (!isObjectLike(context)) {
    return context;
  }
  const original = context;
  // An extensible stand-in, so a frozen context cannot trip the proxy invariants. An arrow function has no non-configurable own keys.
  const prototype = Object.getPrototypeOf(original) as object | null;
  const standIn = (
    typeof original === 'function'
      ? Object.setPrototypeOf(() => undefined, prototype)
      : Object.create(prototype)
  ) as object;
  const bound = new WeakMap<object, unknown>();
  const bind = (method: (...args: unknown[]) => unknown): unknown => {
    if (!bound.has(method)) {
      bound.set(method, method.bind(original));
    }
    return bound.get(method);
  };
  return new Proxy(standIn, {
    apply: (_, self, args: unknown[]) =>
      Reflect.apply(original as (...rest: unknown[]) => unknown, self, args),
    get: (_, read) => {
      if (read === key) {
        return value;
      }
      const found: unknown = Reflect.get(original, read, original);
      return typeof found === 'function'
        ? bind(found as (...args: unknown[]) => unknown)
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
