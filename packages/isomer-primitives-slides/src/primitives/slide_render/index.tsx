/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import {
  quoteMarkdown,
  quoteSlackBlocks,
  quoteText,
  renderChildren,
  renderSlackChildren,
  slackCaption,
} from '../../render';
import { markdownText, singleLine } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { embeddedLabel } from './embedded';
import { examples } from './examples';
import { react } from './react';
import { schema, schemaWith } from './schema';
import type { SlideRenderNode } from './types';

export type { SlideRenderNode } from './types';

/** `[svg render of slide 00]`, then the caption. */
const heading = (
  node: SlideRenderNode,
  format: (text: string) => string = (text) => text
): string =>
  [
    `[${node.surface} render of ${format(embeddedLabel(node))}]`,
    node.caption && format(node.caption),
  ]
    .filter(Boolean)
    .join(' ');

/** Catalog, schema, and renderers for {@link SlideRenderNode}. */
export const slideRenderPrimitive = definePrimitive<SlideRenderNode>({
  type: 'slideRender',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) => schemaWith(bodyNodeSchema),
  renderers: {
    react,
    text: (node, { scope }) =>
      [
        singleLine(heading(node)),
        node.composition &&
          quoteText(renderChildren(node.composition.body, scope, 'text')),
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) =>
      [
        `_${heading(node, markdownText)}_`,
        node.composition &&
          quoteMarkdown(
            renderChildren(node.composition.body, scope, 'markdown')
          ),
      ]
        .filter(Boolean)
        .join('\n\n'),
    slack: (node, { collector, scope }) => [
      slackCaption(heading(node)),
      ...(node.composition
        ? quoteSlackBlocks(
            renderSlackChildren(node.composition.body, scope, collector)
          )
        : []),
    ],
  },
});
