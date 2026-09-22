/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import { renderChildren } from '../../render';
import { bodyNodes, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema } from './schema';
import type { SlideStackNode } from './types';

export type { SlideStackNode } from './types';

/** Catalog, schema, and renderers for {@link SlideStackNode}. */
export const slideStackPrimitive = definePrimitive<SlideStackNode>({
  type: 'slideStack',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({ items: bodyNodes(bodyNodeSchema, schema.shape.items) }),
  renderers: {
    react,
    text: (node, { scope }) => renderChildren(node.items, scope, 'text'),
    markdown: (node, { scope }) =>
      renderChildren(node.items, scope, 'markdown'),
  },
  children: (node) =>
    node.items.map((child, index) => ({
      node: child,
      path: `items[${index}]`,
    })),
});
