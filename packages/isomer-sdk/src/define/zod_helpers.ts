/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const stringWith = (message: string, allowEmpty: boolean) => {
  const base = z.string({ error: () => message });
  return allowEmpty ? base : base.min(1, { error: message });
};

/**
 * A non-empty string.
 *
 * `message` is the suffix `formatZodIssue` prepends a path to, so phrase
 * it as a predicate (`must be a hex color`), not a sentence.
 */
export const requiredString = (message = 'is required') =>
  stringWith(message, false);

/** A string that may be empty. Still rejects a non-string. */
export const optionalString = (message = 'must be a string') =>
  stringWith(message, true);

/** A number, rejecting `NaN` and both infinities. */
export const finiteNumber = (message = 'must be a finite number') =>
  z
    .number({ error: () => message })
    .refine((n) => Number.isFinite(n), { error: message });

/** {@link finiteNumber}, `> 0`. */
export const positiveFiniteNumber = (
  message = 'must be a positive finite number'
) =>
  z
    .number({ error: () => message })
    .refine((n) => Number.isFinite(n) && n > 0, { error: message });

/** {@link finiteNumber}, `>= 0`. */
export const nonNegativeFiniteNumber = (
  message = 'must be a non-negative finite number'
) =>
  z
    .number({ error: () => message })
    .refine((n) => Number.isFinite(n) && n >= 0, { error: message });

/**
 * A closed enum whose default error message lists the accepted values:
 * `must be one of: a, b, c`.
 */
export const enumOf = <T extends readonly [string, ...string[]]>(
  values: T,
  options: { message?: string } = {}
) => {
  const message = options.message ?? `must be one of: ${values.join(', ')}`;
  return z.enum(values, { error: () => message });
};

export { z };
