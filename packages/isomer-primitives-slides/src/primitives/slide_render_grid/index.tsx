/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { escapeMrkdwn } from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import {
  quoteMarkdown,
  quoteSlackBlocks,
  quoteText,
  renderChildren,
  renderSlackChildren,
} from '../../render';
import { markdownText } from '../../render/markdown';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, schemaWith } from './schema';
import type { SlideRenderGridNode } from './types';

export type { SlideRenderGridNode, SlideRenderGridTile } from './types';

const heading = (
  { composition, tiles }: SlideRenderGridNode,
  format: (text: string) => string = (text) => text
): string =>
  `[${composition.title ? format(composition.title) : 'a composition'} on ${tiles.length} surfaces]`;

/** Catalog, schema, and renderers for {@link SlideRenderGridNode}. */
export const slideRenderGridPrimitive = definePrimitive<SlideRenderGridNode>({
  type: 'slideRenderGrid',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) => schemaWith(bodyNodeSchema),
  renderers: {
    react,
    text: (node, { scope }) =>
      [
        [
          heading(node),
          ...node.tiles.map(({ surface, caption }) => `${surface}: ${caption}`),
        ]
          .map(oneLine)
          .join('\n'),
        quoteText(renderChildren(node.composition.body, scope, 'text')),
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) =>
      [
        `_${heading(node, markdownText)}_`,
        node.tiles
          .map(
            ({ surface, caption }) =>
              `- **${surface}**: ${markdownText(caption)}`
          )
          .join('\n'),
        quoteMarkdown(renderChildren(node.composition.body, scope, 'markdown')),
      ]
        .filter(Boolean)
        .join('\n\n'),
    slack: (node, { collector, scope }) => [
      {
        type: 'context',
        elements: node.tiles.map(({ surface, caption }) => ({
          type: 'mrkdwn',
          text: `*${surface}* ${escapeMrkdwn(oneLine(caption))}`,
        })),
      },
      ...quoteSlackBlocks(
        renderSlackChildren(node.composition.body, scope, collector)
      ),
    ],
  },
});
