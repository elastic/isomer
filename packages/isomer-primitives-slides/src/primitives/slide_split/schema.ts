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
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';

const sideSchema = (nodeSchema: ZodType<unknown>) =>
  z
    .object({
      label: z
        .string()
        .min(1)
        .describe('Short uppercase label over the column.')
        .optional(),
      tone: z
        .enum(slideTones)
        .describe(
          'The tone of the label, so only with `label`: `primary` for your product or system, `accent` for the other party. Leave it out for a neutral label.'
        )
        .optional(),
      items: z
        .array(z.union([z.string().min(1), nodeSchema]))
        .min(1)
        .max(6)
        .describe(
          'One to six items, top to bottom. A string is a short bold statement; an object is a slide node (e.g. slideCode, slideTable) and renders as itself. Several nodes stack in order on their own, with no slideStack around them. `code` and `**strong**` marks are allowed.'
        ),
    })
    .strict()
    .check(
      crossRefine(
        ({ label, tone }) => tone === undefined || label !== undefined,
        {
          error: 'tone colors the label, so it needs one',
          path: ['tone'],
        }
      )
    );

/** The split schema over `nodeSchema`, shared by `schema` and `schemaFor`. */
export const buildSchema = (nodeSchema: ZodType<unknown>) => {
  const side = sideSchema(nodeSchema);
  return z
    .object({
      type: z.literal('slideSplit'),
      left: side.describe('The left column.'),
      right: side.describe('The right column.'),
      ratio: z
        .enum(slideSplitRatios)
        .describe(
          'Column widths: `even` 1:1, `wideLeft` 1.1:1, `narrowLeft` 0.75:1.25, `aside` a main column beside a narrow fixed column of notes. Defaults to `even`.'
        )
        .optional(),
      divider: z
        .enum(slideSplitDividers)
        .describe(
          'Between the columns: `gap` is space only; `rule` a vertical line, for two sides that own different things; `hairline` a thin rule, for notes beside a main idea with `aside`; `arrow`, for the left turning into the right. Defaults to `gap`.'
        )
        .optional(),
      footnote: z
        .string()
        .min(1)
        .describe(
          'One sentence under both columns that draws the conclusion. `code` and `**strong**` marks are allowed.'
        )
        .optional(),
      size: sizeField(),
    })
    .strict();
};

/** Zod schema for {@link SlideSplitNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
