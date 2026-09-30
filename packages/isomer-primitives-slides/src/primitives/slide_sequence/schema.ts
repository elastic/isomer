/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { lineText } from '../authored_text';
import { crossSuperRefine } from '../cross_field';
import { sizeField } from '../size';
import { slideToneSchema } from '../tone_schema';

export const sequenceMaxActors = 5;

export const sequenceMaxMessages = 10;

const actorSchema = z
  .object({
    id: lineText().describe(
      'A unique id that messages name in `from` and `to`. It is never drawn.'
    ),
    label: lineText().describe(
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
    from: lineText().describe('The sending actor’s `id`.'),
    to: lineText().describe(
      'The receiving actor’s `id`, never the same as `from`.'
    ),
    label: lineText().describe(
      'What is sent, set above the arrow: a few words, e.g. "Card declined". `code` and `**strong**` marks are allowed; set a call, a path, or an error string as `code`.'
    ),
  })
  .strict();

/** A participant in a {@link SlideSequenceNode}. */
export type SlideSequenceActor = z.infer<typeof actorSchema>;

/** One arrow in a {@link SlideSequenceNode}. */
export type SlideSequenceMessage = z.infer<typeof messageSchema>;

/** Zod schema for {@link SlideSequenceNode}. */
export const schema = z
  .object({
    type: z.literal('slideSequence'),
    actors: z
      .array(actorSchema)
      .min(3)
      .max(sequenceMaxActors)
      .describe(
        `Participants, left to right, each with a lifeline down the slide. 3 to ${sequenceMaxActors}. Every actor sends or receives at least one message. Order them so most messages join neighbors; a message that skips one sets its label by the sender.`
      ),
    messages: z
      .array(messageSchema)
      .min(1)
      .max(sequenceMaxMessages)
      .describe(
        `Messages, top to bottom in the order they happen, each one arrow from sender to receiver. 1 to ${sequenceMaxMessages}.`
      ),
    size: sizeField(),
  })
  .strict()
  .check(
    crossSuperRefine(({ actors, messages }, context) => {
      if (
        actors.length > sequenceMaxActors ||
        messages.length > sequenceMaxMessages
      ) {
        return;
      }
      const ids = new Set<string>();
      actors.forEach(({ id }, index) => {
        if (ids.has(id)) {
          context.addIssue({
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
            context.addIssue({
              code: 'custom',
              message: `message ${key} names unknown actor "${id}"`,
              path: ['messages', index, key],
            });
          }
          used.add(id);
        }
        if (from === to) {
          context.addIssue({
            code: 'custom',
            message: `message from "${from}" to itself; a message joins two different actors`,
            path: ['messages', index, 'to'],
          });
        }
      });
      actors.forEach(({ id }, index) => {
        if (!used.has(id)) {
          context.addIssue({
            code: 'custom',
            message: `actor "${id}" sends or receives no message`,
            path: ['actors', index],
          });
        }
      });
    })
  );

/** Messages between actors, top to bottom in time order. */
export type SlideSequenceNode = z.infer<typeof schema> & PrimitiveNode;
