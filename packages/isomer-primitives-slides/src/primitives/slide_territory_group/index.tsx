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
import { schema, type SlideTerritoryGroupNode } from './schema';

export type { SlideTerritory, SlideTerritoryGroupNode } from './schema';

const text = (node: SlideTerritoryGroupNode) =>
  node.items.map((item) => `${item.title}: ${item.body}`).join('\n');

const markdown = (node: SlideTerritoryGroupNode) =>
  node.items.map((item) => `### ${item.title}\n\n${item.body}`).join('\n\n');

/** Catalog, schema, and renderers for {@link SlideTerritoryGroupNode}. */
export const slideTerritoryGroupPrimitive = definePrimitive({
  type: 'slideTerritoryGroup',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
