/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import {
  isZodCustomCheck,
  zodChecks,
  zodNestedSchemas,
} from '../define/zod_introspect';

/** Options for {@link customChecksOf}. */
export interface CustomChecksOptions {
  /** Stops the walk at a nested schema, such as another primitive's, checked on its own. `schema` itself is never skipped. */
  skip?: (schema: ZodType) => boolean;
}

/**
 * Every custom check reachable from `schema` (`.refine`, `.superRefine`, a
 * `z.refine` given to `.check`, or a `z.custom` schema, which is its own check),
 * each the object Zod holds, so a pack can look up what it recorded when it made one.
 */
export const customChecksOf = (
  schema: ZodType,
  { skip }: CustomChecksOptions = {}
): object[] => {
  // A refinement is itself a `ZodCustom`, reached both as a check and as a nested schema.
  const found = new Set<object>();
  const seen = new Set<ZodType>();
  const queue: ZodType[] = [schema];
  for (let next = queue.pop(); next; next = queue.pop()) {
    if (seen.has(next) || (next !== schema && skip?.(next))) {
      continue;
    }
    seen.add(next);
    for (const check of [next, ...zodChecks(next)]) {
      if (isZodCustomCheck(check)) {
        found.add(check);
      }
    }
    queue.push(...zodNestedSchemas(next));
  }
  return [...found];
};
