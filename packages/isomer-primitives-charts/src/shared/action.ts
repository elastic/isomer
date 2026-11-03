/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const field = z
  .string()
  .min(1)
  .describe('The source field the mark represents.');
const raw = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .describe('A raw field value, never a formatted label.');

const filterSchema = z.union([
  z.object({ field, value: raw }).strict(),
  z
    .object({
      field,
      values: z.array(raw).min(1),
      negate: z
        .boolean()
        .optional()
        .describe('Match none of the values, as Lens filters an Other bucket.'),
    })
    .strict(),
  z
    .object({
      field,
      exists: z
        .boolean()
        .describe(
          '`false` matches documents without the field, as Lens filters a missing bucket.'
        ),
    })
    .strict(),
  z
    .object({
      field,
      range: z
        .object({
          gte: z.number().finite().optional(),
          lt: z.number().finite().optional(),
        })
        .strict()
        .describe('A range bucket: at least `gte` and below `lt`.'),
    })
    .strict(),
  z
    .object({
      query: z.union([z.string(), z.record(z.string(), z.json())]),
      language: z.enum(['kuery', 'lucene']),
    })
    .strict()
    .describe('A query, as Lens filters a `filters` bucket.'),
]);

/** Schema of the action a mark raises when selected. */
export const actionSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe('The action the host routes, e.g. `dashboard/filter`.'),
    filters: z
      .array(filterSchema)
      .optional()
      .describe(
        'The mark’s identity: field = raw value pairs, or the phrases, existence, range or query filter Lens builds for a bucket.'
      ),
    context: z
      .record(z.string(), z.json())
      .optional()
      .describe('Extra JSON passed to the host untouched.'),
  })
  .strict()
  .describe(
    'What activating the mark raises for the host. Omit it and the mark is inert.'
  );

type ChartAction = z.infer<typeof actionSchema>;

/** The SDK action event a mark raises: `context` plus its `key` and `filters`. */
export const toActionEvent = (
  { name, filters, context }: ChartAction,
  key: string
): { name: string; context: Record<string, unknown> } => ({
  name,
  context: { ...context, key, ...(filters ? { filters } : {}) },
});
