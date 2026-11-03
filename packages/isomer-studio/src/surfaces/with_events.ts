/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionEventRef } from '@elastic/isomer-sdk';

type OnEvent = (event: ActionEventRef) => void;

/**
 * `context` with `onEvent` in place of its own, or `context` itself without one. Everything else delegates to
 * `context` with it as the receiver, so a class instance's methods and private fields keep working.
 */
export const withEvents = <T extends object>(
  context: T,
  onEvent: OnEvent | undefined
): T =>
  onEvent === undefined
    ? context
    : new Proxy(context, {
        get: (target, key) => {
          if (key === 'onEvent') {
            return onEvent;
          }
          const value: unknown = Reflect.get(target, key, target);
          return typeof value === 'function'
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        },
        has: (target, key) => key === 'onEvent' || Reflect.has(target, key),
        ownKeys: (target) => [
          ...new Set([...Reflect.ownKeys(target), 'onEvent']),
        ],
        getOwnPropertyDescriptor: (target, key) =>
          key === 'onEvent'
            ? {
                value: onEvent,
                writable: true,
                enumerable: true,
                configurable: true,
              }
            : Reflect.getOwnPropertyDescriptor(target, key),
      });
