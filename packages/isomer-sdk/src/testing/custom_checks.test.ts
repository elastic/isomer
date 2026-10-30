/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { customChecksOf } from './custom_checks';

describe('customChecksOf', () => {
  it('finds custom checks through wrappers, arrays, unions, records, and lazy schemas', () => {
    const onField = z.refine<string>((value) => value !== 'x');
    const onItem = z.refine<{ n: number }>(({ n }) => n > 0);
    const lazy = z.lazy(() => z.string().refine(Boolean));
    const schema = z
      .object({
        a: z.string().check(onField).optional(),
        items: z.array(z.object({ n: z.number() }).check(onItem)),
        either: z.union([z.number(), z.string().superRefine(() => undefined)]),
        map: z.record(z.string(), z.number().refine(Number.isFinite)),
        lazy,
      })
      .refine(() => true);
    const checks = customChecksOf(schema);
    expect(checks).toHaveLength(6);
    expect(checks).toContain(onField);
    expect(checks).toContain(onItem);
  });

  it('finds a z.custom schema, which is its own check, alone and nested', () => {
    const custom = z.custom<string>((value) => typeof value === 'string');
    expect(customChecksOf(custom)).toEqual([custom]);
    expect(customChecksOf(z.object({ a: custom.optional() }))).toEqual([
      custom,
    ]);
    expect(customChecksOf(custom.refine(Boolean))).toHaveLength(2);
    expect(customChecksOf(z.instanceof(Date))).toHaveLength(1);
  });

  it('leaves out built-in checks', () => {
    expect(customChecksOf(z.string().max(3).min(1))).toEqual([]);
  });

  it('stops at a skipped schema but never at the root', () => {
    const other = z.object({ b: z.string() }).refine(() => true);
    const root = z.object({ other }).refine(() => true);
    const skip = (schema: z.ZodType) => schema === other || schema === root;
    expect(customChecksOf(root, { skip })).toHaveLength(1);
    expect(customChecksOf(other, { skip })).toHaveLength(1);
  });
});
