/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `z.toJSONSchema` drops refinements, so each one here names the sentence a description in the authoring schema states its rule in; `stated_rules.test.ts` checks both.

import { z } from '@elastic/isomer-sdk/schema';

const always = () => true;

const statedRules = new WeakMap<object, readonly string[]>();

const stated = <C extends object>(check: C, rules: readonly string[]): C => {
  statedRules.set(check, rules);
  return check;
};

/** The rules a check from this module states, or `undefined` for any other check. */
export const rulesOf = (check: object): readonly string[] | undefined =>
  statedRules.get(check);

/**
 * A `.check()` that adds its own issues and runs even after a field fails, so
 * one validation reports every problem. `rules` are the sentences, word for
 * word, that a description in the authoring JSON Schema states, one for each
 * kind of issue the check raises.
 *
 * ```ts
 * schema.check(
 *   crossSuperRefine<Node>(
 *     ({ rows }, context) => {
 *       if (rows.length > 1) {
 *         context.addIssue({ code: 'custom', path: ['rows'], message: RULES.oneRow });
 *       }
 *     },
 *     [RULES.oneRow]
 *   )
 * );
 * ```
 */
export const crossSuperRefine = <T>(
  refine: (value: T, context: z.core.$RefinementCtx<T>) => void,
  rules: readonly [string, ...string[]]
) =>
  stated(
    z.superRefine<T>(
      (value, context) => {
        try {
          refine(value, context);
        } catch {
          // Unreadable input passes; the field that broke it reports the error.
        }
      },
      { when: always }
    ),
    rules
  );
