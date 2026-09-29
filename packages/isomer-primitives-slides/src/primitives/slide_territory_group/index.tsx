/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown, marksSlack, plainText } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTerritoryGroupNode } from './schema';

export type { SlideTerritory, SlideTerritoryGroupNode } from './schema';

export const text = ({ items }: SlideTerritoryGroupNode): string =>
  items
    .map(({ title, body }) => `${oneLine(title)}: ${plainText(body)}`)
    .join('\n');

export const markdown = ({ items }: SlideTerritoryGroupNode) =>
  items.flatMap(({ title, body }) => [
    md.heading(2, title),
    md.paragraph(...marksMarkdown(body)),
  ]);

export const slack = ({ items }: SlideTerritoryGroupNode): SlackBlock[] => [
  {
    type: 'section',
    fields: items.map(({ title, body }) => ({
      type: 'mrkdwn',
      text: `${bold(oneLine(title))}\n${oneLine(marksSlack(body))}`,
    })),
  },
];

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
    slack,
  },
});
