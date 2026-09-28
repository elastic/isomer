/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { plainText } from '../../render/marks';
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
  return edges.map(
    ([from, to]) =>
      `${terms.get(from) ?? from} ${arrow.value} ${terms.get(to) ?? to}`
  );
};

/** Text renderer for {@link SlideGraphNode}: the caption, a glossary, then one line per edge. */
export const text = (node: SlideGraphNode): string =>
  [
    node.caption && plainText(node.caption),
    node.nodes
      .map(({ term, body }) => `${oneLine(term)}: ${plainText(body)}`)
      .join('\n'),
    relations(node).map(oneLine).join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Markdown renderer for {@link SlideGraphNode}: the caption, a glossary list, then the edges on one line. */
export const markdown = (node: SlideGraphNode): string =>
  [
    node.caption && marksMarkdown(node.caption),
    node.nodes
      .map(
        ({ term, body }) =>
          `- **${markdownText(term)}:** ${marksMarkdown(body)}`
      )
      .join('\n'),
    relations(node).map(markdownText).join(', '),
  ]
    .filter(Boolean)
    .join('\n\n');

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
  },
});
