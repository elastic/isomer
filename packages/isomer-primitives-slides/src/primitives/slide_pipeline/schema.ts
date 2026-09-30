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

export const pipelineMaxSteps = 6;

export const pipelineMaxSpans = 3;

const countsInBounds = (
  steps: readonly unknown[],
  spans: readonly unknown[] = []
): boolean =>
  steps.length <= pipelineMaxSteps && spans.length <= pipelineMaxSpans;

const stepSchema = z
  .object({
    title: lineText().describe(
      'The step’s name: one to three words. In spans mode it is the chip’s text.'
    ),
    body: wrappedText()
      .describe(
        'One sentence under the title on what the step does. Steps mode only; leave it out when `spans` is set, because chips carry no body. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
  })
  .strict();

const spanSchema = z
  .object({
    from: z
      .number()
      .int()
      .min(0)
      .describe('Index into `steps` of the first step the bracket covers.'),
    to: z
      .number()
      .int()
      .min(0)
      .describe(
        'Index into `steps` of the last step the bracket covers, at or after `from`.'
      ),
    tone: slideToneSchema.describe(
      'The tone of the bracket and label: `primary` for your own system, `accent` for the host or a third party.'
    ),
    label: lineText().describe(
      'Who owns the span, in one word set in capitals, e.g. "Runtime".'
    ),
    title: lineText().describe('The span’s claim in a few words.'),
    body: wrappedText().describe(
      'One or two sentences supporting the title. `code` and `**strong**` marks are allowed.'
    ),
  })
  .strict();

/** One step of a {@link SlidePipelineNode}. */
export type SlidePipelineStep = z.infer<typeof stepSchema>;

/** A bracket under a run of steps in a {@link SlidePipelineNode}. */
export type SlidePipelineSpan = z.infer<typeof spanSchema>;

/** Zod schema for {@link SlidePipelineNode}. */
export const schema = z
  .object({
    type: z.literal('slidePipeline'),
    start: lineText()
      .describe(
        'What goes in, as a short code-style chip before the first step, e.g. "Order". Steps mode only.'
      )
      .optional(),
    end: lineText()
      .describe(
        'What comes out, as a short code-style chip after the last step, e.g. "Receipt". Steps mode only.'
      )
      .optional(),
    steps: z
      .array(stepSchema)
      .min(2)
      .max(pipelineMaxSteps)
      .describe(
        `Steps in the order they run, left to right. 2 to ${pipelineMaxSteps}. Without \`spans\` they render numbered, each with a title and body. With \`spans\` they render as chips joined by lines.`
      ),
    spans: z
      .array(spanSchema)
      .max(pipelineMaxSpans)
      .describe(
        `Brackets under runs of adjacent steps, each captioned with who owns that part. Up to ${pipelineMaxSpans}. A non-empty list switches to spans mode: steps become chips, and \`start\`, \`end\`, and step bodies are not allowed. Spans must not overlap. Leave it out or empty for steps mode.`
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossRefine(
      ({ steps, spans = [] }) =>
        !countsInBounds(steps, spans) ||
        spans.every(({ from, to }) => from <= to && to < steps.length),
      {
        error: 'each span needs `from` ≤ `to` < the number of steps',
        path: ['spans'],
      }
    )
  )
  .check(
    crossRefine(
      ({ steps, spans = [] }) =>
        !countsInBounds(steps, spans) ||
        [...spans]
          .sort((a, b) => a.from - b.from)
          .every(
            ({ from }, index, sorted) => from > (sorted[index - 1]?.to ?? -1)
          ),
      { error: 'spans must not overlap', path: ['spans'] }
    )
  )
  .check(
    crossRefine(
      ({ spans, start, end }) =>
        !spans?.length || (start === undefined && end === undefined),
      {
        error:
          '`start` and `end` are steps mode only; with `spans`, make them the first and last steps',
        path: ['spans'],
      }
    )
  )
  .check(
    crossRefine(
      ({ spans, steps }) =>
        !countsInBounds(steps, spans) ||
        !spans?.length ||
        steps.every(({ body }) => body === undefined),
      {
        error:
          'step bodies are steps mode only; with `spans`, put the detail in the span’s body',
        path: ['steps'],
      }
    )
  );

/** Ordered steps along one path, optionally bracketed by who owns each run. */
export type SlidePipelineNode = z.infer<typeof schema> & PrimitiveNode;
