/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { displayColumns } from '../../render/mono';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTreeNode } from './schema';

export type { SlideTreeEntry, SlideTreeNode } from './schema';

const { glyph } = slideDistillery.tokens.tree;

export const text = ({ root, entries }: SlideTreeNode): string => {
  const rows = entries.map(({ name, body }) => ({
    name: oneLine(name),
    body: oneLine(body),
  }));
  const width = Math.max(...rows.map(({ name }) => displayColumns(name)));
  return [
    oneLine(root),
    ...rows.map(({ name, body }, index) => {
      const connector =
        index === rows.length - 1 ? glyph.last.value : glyph.branch.value;
      return `${connector} ${name}${' '.repeat(width - displayColumns(name))}${glyph.gutter.value}${body}`;
    }),
  ].join('\n');
};

export const markdown = (node: SlideTreeNode) => [
  md.codeBlock(text(node), 'text'),
];

export const slack = (node: SlideTreeNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_preformatted',
        elements: [{ type: 'text', text: text(node) }],
      },
    ],
  },
];

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
    slack,
  },
});
