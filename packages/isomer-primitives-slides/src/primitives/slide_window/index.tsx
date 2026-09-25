/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import {
  renderChildren,
  renderSlackChildren,
  slackCaption,
} from '../../render';
import { contentNode, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { buildSchema, schema } from './schema';
import { windowTitle } from './title';
import type { SlideWindowNode } from './types';

export type { SlideWindowNode } from './types';

/** Catalog, schema, and renderers for {@link SlideWindowNode}. */
export const slideWindowPrimitive = definePrimitive<SlideWindowNode>({
  type: 'slideWindow',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    buildSchema(contentNode(bodyNodeSchema)),
  renderers: {
    react,
    text: (node, { scope }) =>
      [`[${windowTitle(node)}]`, renderChildren(node.body, scope, 'text')]
        .filter(Boolean)
        .join('\n'),
    markdown: (node, { scope }) =>
      [`**${windowTitle(node)}**`, renderChildren(node.body, scope, 'markdown')]
        .filter(Boolean)
        .join('\n\n'),
    slack: (node, { collector, scope }) => [
      slackCaption(windowTitle(node), true),
      ...renderSlackChildren(node.body, scope, collector),
    ],
  },
  children: (node) =>
    node.body.map((child, index) => ({
      node: child,
      path: `body[${index}]`,
    })),
  hasOwnContent: () => true,
});
