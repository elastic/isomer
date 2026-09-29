/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText, wrappedText } from '../authored_text';
import { crossRefine } from '../cross_field';
import { sizeField } from '../size';
import { slideToneSchema } from '../tone_schema';

const layerSchema = z
  .object({
    name: lineText().describe(
      'The layer, one or two words, set large on the left.'
    ),
    body: wrappedText()
      .describe(
        'What the layer does, in one short line. Give `body` or `chips`, not both. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    chips: z
      .array(lineText().describe('One short name, set as a code chip.'))
      .min(1)
      .max(6)
      .describe(
        'Short names the layer is made of, set as code chips, e.g. file formats or services. 1 to 6. Give `chips` or `body`, not both.'
      )
      .optional(),
    owner: lineText().describe(
      'Who owns the layer, one to three words, set as a label on the right, e.g. a team.'
    ),
    tone: slideToneSchema
      .describe(
        'The tone of the owner: `primary` for your side, `accent` for a host or partner. Leave it out for a neutral owner.'
      )
      .optional(),
  })
  .strict()
  .check(
    crossRefine(
      ({ body, chips }) => (body === undefined) !== (chips === undefined),
      { error: 'a layer has exactly one of `body` or `chips`' }
    )
  );

/** One band of a {@link SlideLayersNode}. */
export type SlideLayer = z.infer<typeof layerSchema>;

/** Zod schema for {@link SlideLayersNode}. */
export const schema = z
  .object({
    type: z.literal('slideLayers'),
    layers: z
      .array(layerSchema)
      .min(3)
      .max(6)
      .describe(
        'Layers, top to bottom in stack order: the layer nearest the user first. 3 to 6.'
      ),
    size: sizeField(),
  })
  .strict();

/** An ordered stack of layers, each with an owner. */
export type SlideLayersNode = z.infer<typeof schema> & PrimitiveNode;
