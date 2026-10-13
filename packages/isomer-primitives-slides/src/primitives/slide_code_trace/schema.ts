/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren, textFromChildren } from '@elastic/isomer-sdk/author';

import { codeLineMaxLength } from '../../theme/components/code';
import {
  lineRoom,
  panelSchema,
  panelWidthCheck,
  type SlideCodePanel,
} from '../slide_code/schema';

/** Zod schema for {@link SlideCodeTraceNode}. */
export const schema = z
  .object({
    type: z.literal('slideCodeTrace'),
    panels: fromChildren(
      'panel',
      z
        .array(panelSchema)
        .length(2)
        .describe(
          `Two panels, left then right, with an arrow between them tracing a value from one file to the next. A trace needs the full slide width; do not put it in a slideSplitLayout column. ${lineRoom(2)}`
        ),
      {
        propsSchema: z.strictObject({
          ...panelSchema.shape,
          text: panelSchema.shape.text.optional(),
        }),
        toItem: ({ children, ...panel }) => ({
          ...panel,
          ...(panel.text === undefined && children !== undefined
            ? { text: textFromChildren(children, { dedent: true }) }
            : {}),
        }),
      }
    ),
  })
  .strict()
  .check(
    panelWidthCheck<{ panels: readonly SlideCodePanel[] }>(
      ({ panels }) => panels,
      ['panels'],
      `A line holds ${codeLineMaxLength(2, false)} columns in each of two panels`
    )
  );

/** Source code in two panels joined by an arrow. */
export type SlideCodeTraceNode = z.infer<typeof schema> & PrimitiveNode;
