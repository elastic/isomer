/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

/** Primitive types that hold an embedded body. */
export const EMBEDDING_TYPES: ReadonlySet<string> = new Set([
  'slideAnnotatedRender',
  'slideRender',
  'slideRenderGrid',
]);

/** Path to the first {@link EMBEDDING_TYPES} node anywhere inside `value`. */
export const findNestedRender = (
  value: unknown,
  path: readonly (string | number)[] = []
): (string | number)[] | undefined => {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findNestedRender(item, [...path, index]);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { type } = value as { type?: unknown };
  if (typeof type === 'string' && EMBEDDING_TYPES.has(type)) {
    return [...path];
  }
  for (const [key, child] of Object.entries(value)) {
    const found = findNestedRender(child, [...path, key]);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/**
 * An embedded body: whole slides, so a `slideFrame` is allowed. It is not a walked child, so its ids are its own and nothing in it renders an anchor.
 */
export const embeddedBody = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .array(bodyNodeSchema)
    .min(1)
    .check(
      z.superRefine((body, ctx) => {
        const found = findNestedRender(body);
        if (found) {
          ctx.addIssue({
            code: 'custom',
            message: 'an embedded body cannot hold another render',
            path: found,
          });
        }
      })
    );
