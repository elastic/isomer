/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import {
  type AuthorChildContext,
  fromChildren,
} from '@elastic/isomer-sdk/author';
import type { ZodType } from 'zod';

import {
  slideSplitDividers,
  slideSplitRatios,
  slideTones,
} from '../../theme/variants';
import { lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';

import type { SlideSplitPane } from './types';

const paneSchema = (nodeSchema: ZodType<unknown>) =>
  z
    .object({
      label: lineText()
        .describe('Short uppercase label over the column.')
        .optional(),
      tone: z
        .enum(slideTones)
        .describe(
          'The tone of the label, so only with `label`: `primary` for your product or system, `accent` for the other party. Leave it out for a neutral label.'
        )
        .optional(),
      items: z
        .array(nodeSchema)
        .min(1)
        .max(6)
        .describe(
          'One to six slide nodes, top to bottom, e.g. a slideBulletList of short points or a slideCode. They stack on their own, with no slideStack around them.'
        ),
    })
    .strict()
    .check(
      crossRefine(
        ({ label, tone }) => tone === undefined || label !== undefined,
        {
          error: 'tone colors the label, so it needs one',
          path: ['tone'],
          rule: 'so only with `label`',
        }
      )
    );

export const panesField = (nodeSchema: ZodType<unknown>) =>
  z
    .array(paneSchema(nodeSchema))
    .length(2)
    .describe('Exactly two columns: left, then right.');

/** Shared by `schema` and `schemaFor`. */
export const buildSchema = <TPanes extends ZodType>(panes: TPanes) =>
  z
    .object({
      type: z.literal('slideSplit'),
      panes,
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
      footnote: wrappedText()
        .describe(
          'One sentence under both columns that draws the conclusion. `code` and `**strong**` marks are allowed.'
        )
        .optional(),
    })
    .strict();

const { label, tone } = paneSchema(unresolvedBodyNodeSchema).shape;
const panePropsSchema = z.strictObject({ label, tone });

type SlideSplitPaneProps = Omit<SlideSplitPane, 'items'> & {
  children?: ReactNode;
};

/** Zod schema for {@link SlideSplitNode}. */
export const schema = buildSchema(
  fromChildren('slideSplitPane', panesField(unresolvedBodyNodeSchema), {
    propsSchema: panePropsSchema,
    toItem: (
      { children, ...pane }: SlideSplitPaneProps,
      { parseChildren }: AuthorChildContext
    ) => ({ ...pane, items: parseChildren(children) }),
  })
);
