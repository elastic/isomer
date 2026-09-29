/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideGraphNode } from './schema';

export type {
  SlideGraphNode,
  SlideGraphPlacement,
  SlideGraphTerm,
} from './schema';

const { arrow } = slideDistillery.tokens.graph;

const relations = ({ nodes, edges }: SlideGraphNode): string[] => {
  const terms = new Map(nodes.map(({ id, term }) => [id, term]));
  return edges.map(([from, to]) =>
    oneLine(`${terms.get(from) ?? from} ${arrow.value} ${terms.get(to) ?? to}`)
  );
};

export const text = (node: SlideGraphNode): string =>
  [
    node.caption && plainText(node.caption),
    node.nodes
      .map(({ term, body }) => `${oneLine(term)}: ${plainText(body)}`)
      .join('\n'),
    relations(node).join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = (node: SlideGraphNode) => [
  ...(node.caption ? [md.paragraph(...marksMarkdown(node.caption))] : []),
  md.list(
    node.nodes.map(({ term, body }) =>
      md.paragraph(md.strong(`${term}:`), ' ', ...marksMarkdown(body))
    )
  ),
  md.paragraph(relations(node).join(', ')),
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
        elements: node.nodes.map(({ term, body }) => ({
          type: 'rich_text_section',
          elements: [
            richTextRun(`${term}:`, { bold: true }),
            richTextRun(' '),
            ...marksRichText(body),
          ],
        })),
      },
    ],
  },
  {
    type: 'context',
    elements: [{ type: 'plain_text', text: relations(node).join(', ') }],
  },
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
