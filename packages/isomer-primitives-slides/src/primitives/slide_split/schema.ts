/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import {
  slideSplitDividers,
  slideSplitRatios,
  slideTones,
} from '../../theme/variants';

const sideSchema = (nodeSchema: ZodType<unknown>, side: 'left' | 'right') =>
  z
    .object({
      label: z
        .string()
        .min(1)
        .describe(`Short uppercase label over the ${side} column.`)
        .optional(),
      tone: z
        .enum(slideTones)
        .describe(
          'Colors the label: `primary` for your product or system, `pink` for the other party. Defaults to grey.'
        )
        .optional(),
      items: z
        .array(z.union([z.string().min(1), nodeSchema]))
        .min(1)
        .max(6)
        .describe(
          'One to six items, top to bottom. A string is a short bold statement; an object is a slide node (e.g. slideCode, slideTable) and renders as itself.'
        ),
    })
    .strict()
    .describe(`The ${side} column.`);

/** The split schema over `nodeSchema`, shared by `schema` and `schemaFor`. */
export const buildSchema = (nodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideSplit'),
      left: sideSchema(nodeSchema, 'left'),
      right: sideSchema(nodeSchema, 'right'),
      ratio: z
        .enum(slideSplitRatios)
        .describe(
          'Column widths: `even` 1:1, `wideLeft` 1.1:1, `narrowLeft` 0.75:1.25. Defaults to `even`.'
        )
        .optional(),
      divider: z
        .enum(slideSplitDividers)
        .describe(
          'Between the columns: `gap` is space only; `rule` a vertical line, for two sides that own different things; `arrow`, for the left turning into the right. Defaults to `gap`.'
        )
        .optional(),
      footnote: z
        .string()
        .min(1)
        .describe('One sentence under both columns that draws the conclusion.')
        .optional(),
    })
    .strict();

/** Zod schema for {@link SlideSplitNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
