/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { crossSuperRefine } from '../cross_field';
import { sizeField } from '../size';
import { slideToneSchema } from '../tone_schema';

/** Most actors a {@link SlideSequenceNode} holds. */
export const sequenceMaxActors = 5;

/** Most messages a {@link SlideSequenceNode} holds. */
export const sequenceMaxMessages = 10;

const actorSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('A unique id that messages name in `from` and `to`.'),
    label: z
      .string()
      .min(1)
      .describe(
        'The participant, set in a monospace chip at the top of its lifeline: one short word, e.g. "browser".'
      ),
    tone: slideToneSchema
      .describe(
        'The tone of the chip and every message this actor sends: `primary` for your side, `accent` for a host or partner. Leave it out for a neutral actor.'
      )
      .optional(),
  })
  .strict();

const messageSchema = z
  .object({
    from: z.string().min(1).describe('The sending actor’s `id`.'),
    to: z
      .string()
      .min(1)
      .describe('The receiving actor’s `id`, never the same as `from`.'),
    label: z
      .string()
      .min(1)
      .describe(
        'What is sent, set above the arrow on one line that never wraps: a few words, e.g. "Card declined". `code` and `**strong**` marks are allowed.'
      ),
    mono: z
      .boolean()
      .describe(
        'Sets the label in monospace, for a call, a path, or an error string. Defaults to false.'
      )
      .optional(),
  })
  .strict();

/** Zod schema for {@link SlideSequenceNode}. */
export const schema = z
  .object({
    type: z.literal('slideSequence'),
    actors: z
      .array(actorSchema)
      .min(3)
      .max(sequenceMaxActors)
      .describe(
        '3–5 participants, left to right, each with a lifeline down the slide. Every actor sends or receives at least one message. Order them so most messages join neighbors; a message that skips one sets its label by the sender.'
      ),
    messages: z
      .array(messageSchema)
      .min(1)
      .max(sequenceMaxMessages)
      .describe(
        '1–10 messages, top to bottom in the order they happen. Each draws one arrow from sender to receiver.'
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossSuperRefine(({ actors, messages }, ctx) => {
      const ids = new Set<string>();
      actors.forEach(({ id }, index) => {
        if (ids.has(id)) {
          ctx.addIssue({
            code: 'custom',
            message: `duplicate actor id "${id}"`,
            path: ['actors', index, 'id'],
          });
        }
        ids.add(id);
      });
      const used = new Set<string>();
      messages.forEach(({ from, to }, index) => {
        for (const [key, id] of [
          ['from', from],
          ['to', to],
        ] as const) {
          if (!ids.has(id)) {
            ctx.addIssue({
              code: 'custom',
              message: `message ${key} names unknown actor "${id}"`,
              path: ['messages', index, key],
            });
          }
          used.add(id);
        }
        if (from === to) {
          ctx.addIssue({
            code: 'custom',
            message: `message from "${from}" to itself; a message joins two different actors`,
            path: ['messages', index, 'to'],
          });
        }
      });
      actors.forEach(({ id }, index) => {
        if (!used.has(id)) {
          ctx.addIssue({
            code: 'custom',
            message: `actor "${id}" sends or receives no message`,
            path: ['actors', index],
          });
        }
      });
    })
  );

/** A participant in a {@link SlideSequenceNode}. */
export type SlideSequenceActor = z.infer<typeof actorSchema>;

/** One arrow in a {@link SlideSequenceNode}. */
export type SlideSequenceMessage = z.infer<typeof messageSchema>;

/** Messages between 3–5 actors, top to bottom in time order. */
export type SlideSequenceNode = z.infer<typeof schema> & PrimitiveNode;
