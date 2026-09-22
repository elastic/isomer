/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import { renderChildren } from '../../render';
import { slideDistillery } from '../../theme/distillery';
import { scalePx } from '../../theme/scale';
import { SLIDE_THEME } from '../../theme/theme';
import { bodyNodes, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema } from './schema';
import type { SlideFrameNode } from './types';

export { SlideFrameView } from './react';
export type { SlideFrameNode } from './types';

const chapterLine = (node: SlideFrameNode): string =>
  [node.chapterNumber, node.chapter]
    .filter(Boolean)
    .join(slideDistillery.tokens.frame.chapterSeparator.value);

/** Catalog, schema, and renderers for {@link SlideFrameNode}. */
export const slideFramePrimitive = definePrimitive<SlideFrameNode>({
  type: 'slideFrame',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({ body: bodyNodes(bodyNodeSchema, schema.shape.body) }),
  renderers: {
    react,
    text: (node, { scope }) =>
      [chapterLine(node), renderChildren(node.body, scope, 'text')]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) =>
      [
        chapterLine(node) ? `## ${chapterLine(node)}` : '',
        renderChildren(node.body, scope, 'markdown'),
      ]
        .filter(Boolean)
        .join('\n\n'),
  },
  children: (node) =>
    node.body.map((child, index) => ({
      node: child,
      path: `body[${index}]`,
    })),
  hasOwnContent: () => true,
  metrics: {
    svgHeight: () => scalePx(SLIDE_THEME.frame.height),
  },
});
