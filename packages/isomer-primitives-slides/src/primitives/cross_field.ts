/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

// Zod skips an object's refinements once a field fails; these run anyway, so one validation reports both.
// Input too malformed to read passes: the field that broke it reports its own error.

const always = () => true;

type RefineParams = Exclude<Parameters<typeof z.refine>[1], string | undefined>;

/** A rule across a node's fields, for `.check()`, that runs even when a field has already failed. */
export const crossRefine = <T>(
  check: (value: NoInfer<T>) => boolean,
  params: RefineParams
) =>
  z.refine<T>(
    (value) => {
      try {
        return check(value);
      } catch {
        return true;
      }
    },
    { ...params, when: always }
  );

/** {@link crossRefine} for a rule that adds its own issues. */
export const crossSuperRefine = <T>(
  refine: (value: T, context: z.core.$RefinementCtx<T>) => void
) =>
  z.superRefine<T>(
    (value, context) => {
      try {
        refine(value, context);
      } catch {
        // Reported by the field that made it unreadable.
      }
    },
    { when: always }
  );
