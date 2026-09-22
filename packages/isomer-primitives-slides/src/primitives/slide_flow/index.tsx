/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideFlowNode } from './schema';

export type { SlideFlowNode } from './schema';

const text = (node: SlideFlowNode) =>
  [node.label, node.nodes.join(' -> ')].filter(Boolean).join('\n');

const markdown = (node: SlideFlowNode) =>
  [node.label ? `### ${node.label}` : '', node.nodes.join(' -> ')]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideFlowNode}. */
export const slideFlowPrimitive = definePrimitive({
  type: 'slideFlow',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
