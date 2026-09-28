/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import {
  markdownCode,
  markdownText,
  marksMarkdown,
} from '../../render/markdown';
import { plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import {
  schema,
  type SlideSequenceMessage,
  type SlideSequenceNode,
} from './schema';

export type {
  SlideSequenceActor,
  SlideSequenceMessage,
  SlideSequenceNode,
} from './schema';

const { arrow } = slideDistillery.tokens.sequence;

const lines = (
  { actors, messages }: SlideSequenceNode,
  label: (message: SlideSequenceMessage) => string
): string => {
  const names = new Map(actors.map(({ id, label: name }) => [id, name]));
  return messages
    .map(
      (message, index) =>
        `${index + 1}. ${names.get(message.from) ?? message.from} ${arrow.value} ${names.get(message.to) ?? message.to}: ${label(message)}`
    )
    .join('\n');
};

/** Text renderer for {@link SlideSequenceNode}: one numbered `from → to: label` line per message. */
export const text = (node: SlideSequenceNode): string =>
  lines(
    {
      ...node,
      actors: node.actors.map((actor) => ({
        ...actor,
        label: oneLine(actor.label),
      })),
    },
    ({ label, mono }) => (mono ? oneLine(label) : plainText(label))
  );

/** Markdown renderer for {@link SlideSequenceNode}: a numbered list, with mono labels as code. */
export const markdown = (node: SlideSequenceNode): string =>
  lines(
    {
      ...node,
      actors: node.actors.map((actor) => ({
        ...actor,
        label: markdownText(actor.label),
      })),
    },
    ({ label, mono }) => (mono ? markdownCode(label) : marksMarkdown(label))
  );

/** Catalog, schema, and renderers for {@link SlideSequenceNode}. */
export const slideSequencePrimitive = definePrimitive({
  type: 'slideSequence',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
