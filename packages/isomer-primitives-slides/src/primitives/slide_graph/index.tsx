/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
} from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideGraphNode, type SlideGraphTerm } from './schema';

export type {
  SlideGraphNode,
  SlideGraphPlacement,
  SlideGraphTerm,
} from './schema';

const { arrow, relationJoiner } = slideDistillery.tokens.graph;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

const cue = ({ emphasis }: SlideGraphTerm): string =>
  toneCueText(emphasis ? 'primary' : undefined);

const relations = ({ nodes, edges }: SlideGraphNode): string => {
  const terms = new Map(nodes.map(({ id, term }) => [id, term]));
  return edges
    .map(([from, to]) =>
      oneLine(
        `${terms.get(from) ?? from} ${arrow.value} ${terms.get(to) ?? to}`
      )
    )
    .join(relationJoiner.value);
};

export const text = (node: SlideGraphNode): string =>
  [
    node.caption && plainText(node.caption),
    node.nodes
      .map(
        (term) =>
          `${cue(term)}${oneLine(term.term)}${termJoiner}${plainText(term.body)}`
      )
      .join('\n'),
    relations(node),
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = (node: SlideGraphNode) => [
  ...(node.caption ? [md.paragraph(...marksMarkdown(node.caption))] : []),
  md.list(
    node.nodes.map((term) =>
      md.paragraph(
        ...(term.emphasis ? [cue(term)] : []),
        md.strong(term.term),
        termJoiner,
        ...marksMarkdown(term.body)
      )
    )
  ),
  md.paragraph(relations(node)),
];

export const slack = (node: SlideGraphNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      ...(node.caption
        ? [
            {
              type: 'rich_text_section' as const,
              elements: marksRichText(node.caption),
            },
          ]
        : []),
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: node.nodes.map((term) => ({
          type: 'rich_text_section',
          elements: [
            ...(term.emphasis ? [richTextRun(cue(term))] : []),
            richTextRun(term.term, { bold: true }),
            richTextRun(termJoiner),
            ...marksRichText(term.body),
          ],
        })),
      },
    ],
  },
  slackCaption(relations(node)),
];

/** Catalog, schema, and renderers for {@link SlideGraphNode}. */
export const slideGraphPrimitive = definePrimitive({
  type: 'slideGraph',
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
