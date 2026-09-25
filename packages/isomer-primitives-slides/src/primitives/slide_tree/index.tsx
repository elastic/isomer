/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTreeNode } from './schema';

export type { SlideTreeEntry, SlideTreeNode } from './schema';

const { glyph } = slideDistillery.tokens.tree;

/** The tree as aligned lines: root, then one connector, name, and body per entry. */
export const text = ({ root, entries }: SlideTreeNode): string => {
  const width = Math.max(...entries.map(({ name }) => name.length));
  return [
    root,
    ...entries.map(({ name, body }, index) => {
      const connector =
        index === entries.length - 1 ? glyph.last.value : glyph.branch.value;
      return `${connector} ${name.padEnd(width)}  ${body}`;
    }),
  ].join('\n');
};

/** Markdown renderer for {@link SlideTreeNode}: {@link text} in a fenced block. */
export const markdown = (node: SlideTreeNode): string =>
  `\`\`\`text\n${text(node)}\n\`\`\``;

/** Catalog, schema, and renderers for {@link SlideTreeNode}. */
export const slideTreePrimitive = definePrimitive({
  type: 'slideTree',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
