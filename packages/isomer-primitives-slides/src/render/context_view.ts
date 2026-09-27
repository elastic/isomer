/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `context` reading `fields` in place of its own, as a view rather than a
 * copy: every other read goes to `context`, with methods bound to it, so a
 * class-instance context keeps its prototype and private state. The fields
 * survive a context derived from the view by spreading.
 */
export const withContextFields = <TContext extends object>(
  context: TContext | undefined,
  fields: Partial<TContext>
): TContext => {
  if (context === undefined) {
    return { ...fields } as TContext;
  }
  const own = (key: string | symbol) => Object.hasOwn(fields, key);
  // An extensible stand-in, so a frozen context cannot trip the proxy invariants.
  const standIn = Object.create(
    Object.getPrototypeOf(context) as object | null
  ) as object;
  return new Proxy(standIn, {
    get: (_, key) => {
      if (own(key)) {
        return (fields as Record<string | symbol, unknown>)[key];
      }
      const value: unknown = Reflect.get(context, key, context);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(context)
        : value;
    },
    set: (_, key, value) => Reflect.set(context, key, value, context),
    has: (_, key) => own(key) || Reflect.has(context, key),
    ownKeys: () => [
      ...new Set([...Reflect.ownKeys(context), ...Reflect.ownKeys(fields)]),
    ],
    getOwnPropertyDescriptor: (_, key) => {
      if (own(key)) {
        return {
          value: (fields as Record<string | symbol, unknown>)[key],
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(context, key);
      return descriptor && { ...descriptor, configurable: true };
    },
    getPrototypeOf: () => Object.getPrototypeOf(context) as object | null,
  }) as TContext;
};
