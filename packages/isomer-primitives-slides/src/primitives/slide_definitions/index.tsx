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
import { schema, type SlideDefinitionsNode } from './schema';

export type { SlideDefinition, SlideDefinitionsNode } from './schema';

export const text = ({ items }: SlideDefinitionsNode): string =>
  items
    .map(({ term, body }) => `${oneLine(term)}: ${plainText(body)}`)
    .join('\n');

export const markdown = ({ items }: SlideDefinitionsNode) => [
  md.list(
    items.map(({ term, body }) =>
      md.paragraph(md.strong(term), ': ', ...marksMarkdown(body))
    )
  ),
];

export const slack = ({ items }: SlideDefinitionsNode): SlackBlock[] => [
  {
    type: 'section',
    fields: items.map(({ term, body }) => ({
      type: 'mrkdwn',
      text: `${bold(oneLine(term))}\n${oneLine(marksSlack(body))}`,
    })),
  },
];

/** Catalog, schema, and renderers for {@link SlideDefinitionsNode}. */
export const slideDefinitionsPrimitive = definePrimitive({
  type: 'slideDefinitions',
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
