/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownText, marksMarkdown, stripMarks } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTerritoryGroupNode } from './schema';

export type { SlideTerritory, SlideTerritoryGroupNode } from './schema';

/** Text renderer for {@link SlideTerritoryGroupNode}: `Title: body` per owner. */
export const text = ({ items }: SlideTerritoryGroupNode): string =>
  items.map(({ title, body }) => `${title}: ${stripMarks(body)}`).join('\n');

/** Markdown renderer for {@link SlideTerritoryGroupNode}: a heading per owner. */
export const markdown = ({ items }: SlideTerritoryGroupNode): string =>
  items
    .map(
      ({ title, body }) => `## ${markdownText(title)}\n\n${marksMarkdown(body)}`
    )
    .join('\n\n');

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
