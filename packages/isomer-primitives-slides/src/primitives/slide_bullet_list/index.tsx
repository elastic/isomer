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
import { schema, type SlideBulletListNode } from './schema';

export type { SlideBulletListNode } from './schema';

const text = (node: SlideBulletListNode) =>
  [node.label, node.items.map((item) => `- ${item}`).join('\n')]
    .filter(Boolean)
    .join('\n');

const markdown = (node: SlideBulletListNode) =>
  [
    node.label ? `### ${node.label}` : '',
    node.items.map((item) => `- ${item}`).join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideBulletListNode}. */
export const slideBulletListPrimitive = definePrimitive({
  type: 'slideBulletList',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
