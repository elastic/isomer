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
import type { SlideSplitNode } from './types';

export type { SlideSplitNode } from './types';

/** Catalog, schema, and renderers for {@link SlideSplitNode}. */
export const slideSplitPrimitive = definePrimitive<SlideSplitNode>({
  type: 'slideSplit',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({
      left: bodyNodes(bodyNodeSchema, schema.shape.left),
      right: bodyNodes(bodyNodeSchema, schema.shape.right),
    }),
  renderers: {
    react,
    text: (node, { scope }) =>
      renderChildren([...node.left, ...node.right], scope, 'text'),
    markdown: (node, { scope }) =>
      renderChildren([...node.left, ...node.right], scope, 'markdown'),
  },
  children: (node) => [
    ...node.left.map((child, index) => ({
      node: child,
      path: `left[${index}]`,
    })),
    ...node.right.map((child, index) => ({
      node: child,
      path: `right[${index}]`,
    })),
  ],
});
