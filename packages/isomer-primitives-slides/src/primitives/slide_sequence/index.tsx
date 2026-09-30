/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown, marksRichText, plainText } from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideSequenceNode } from './schema';

export type {
  SlideSequenceActor,
  SlideSequenceMessage,
  SlideSequenceNode,
} from './schema';

const arrow = ` ${slideDistillery.tokens.sequence.arrow.value} `;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

/** Each message's route, by actor label and tone cue, never id, and its label. */
const routed = ({ actors, messages }: SlideSequenceNode) => {
  const names = new Map(
    actors.map(({ id, label, tone }) => [
      id,
      `${toneCueText(tone)}${oneLine(label)}`,
    ])
  );
  const name = (id: string) => names.get(id) ?? oneLine(id);
  return messages.map(({ from, to, label }) => ({
    route: `${name(from)}${arrow}${name(to)}${termJoiner}`,
    label,
  }));
};

export const text = (node: SlideSequenceNode): string =>
  routed(node)
    .map(
      ({ route, label }, index) => `${index + 1}. ${route}${plainText(label)}`
    )
    .join('\n');

export const markdown = (node: SlideSequenceNode) =>
  md.list(
    routed(node).map(({ route, label }) =>
      md.paragraph(route, ...marksMarkdown(label))
    ),
    { ordered: true }
  );

export const slack = (node: SlideSequenceNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'ordered',
        elements: routed(node).map(({ route, label }) => ({
          type: 'rich_text_section',
          elements: [{ type: 'text', text: route }, ...marksRichText(label)],
        })),
      },
    ],
  },
];

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
    slack,
  },
});
