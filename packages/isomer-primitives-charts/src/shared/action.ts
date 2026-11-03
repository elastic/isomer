/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const filterSchema = z
  .object({
    field: z.string().min(1).describe('The source field the mark represents.'),
    value: z
      .union([z.string(), z.number(), z.boolean(), z.null()])
      .describe('The raw field value, never a formatted label.'),
  })
  .strict();

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
      .describe('The mark’s identity as field = raw value pairs.'),
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
