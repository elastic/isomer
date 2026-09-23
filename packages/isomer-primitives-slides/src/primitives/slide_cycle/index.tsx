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
import { schema, type SlideCycleNode } from './schema';

export type { SlideCycleNode } from './schema';

const loop = (node: SlideCycleNode): string =>
  [...node.nodes, node.nodes[0]].join(' -> ');

/** Text renderer for {@link SlideCycleNode}. */
export const text = (node: SlideCycleNode): string =>
  [node.label, node.center ? `${node.center}: ${loop(node)}` : loop(node)]
    .filter(Boolean)
    .join('\n');

/** Markdown renderer for {@link SlideCycleNode}. */
export const markdown = (node: SlideCycleNode): string =>
  [
    node.label ? `### ${node.label}` : '',
    node.center ? `**${node.center}:** ${loop(node)}` : loop(node),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideCycleNode}. */
export const slideCyclePrimitive = definePrimitive({
  type: 'slideCycle',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
