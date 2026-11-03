/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A value code outside React updates and React reads with `useSyncExternalStore`. */
export interface Store<T> {
  get: () => T;
  /** Notifies subscribers unless `next` is the current value. */
  set: (next: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export const createStore = <T>(initial: T): Store<T> => {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) {
        return;
      }
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
