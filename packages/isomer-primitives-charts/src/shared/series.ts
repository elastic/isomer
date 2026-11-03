/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const pointSchema = z
  .object({
    x: z.number().int().describe('Epoch milliseconds.'),
    y: z
      .number()
      .finite()
      .nullable()
      .describe('The measured value; `null` is a gap, never zero.'),
  })
  .strict();

export type Point = z.infer<typeof pointSchema>;

/** Points in strictly increasing `x`, so no instant appears twice. */
export const pointsSchema = z
  .array(pointSchema)
  .min(2)
  .max(2000)
  .check((ctx) => {
    ctx.value.forEach((point, index) => {
      if (index > 0 && point.x <= ctx.value[index - 1]!.x) {
        ctx.issues.push({
          code: 'custom',
          message: 'points must be in strictly increasing `x`',
          path: [index, 'x'],
          input: point.x,
        });
      }
    });
  });
