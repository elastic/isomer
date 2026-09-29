/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

const always = () => true;

type RefineParams = Exclude<Parameters<typeof z.refine>[1], string | undefined>;

/** A `.check()` rule that runs even after a field fails, so one validation reports both. */
export const crossRefine = <T>(
  check: (value: NoInfer<T>) => boolean,
  params: RefineParams
) =>
  z.refine<T>(
    (value) => {
      try {
        return check(value);
      } catch {
        // Unreadable input passes; the field that broke it reports the error.
        return true;
      }
    },
    { ...params, when: always }
  );
