/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { richTextSection, slackFields, slackRichText } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
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
  slackFields(
    items.map(
      ({ term, body }) => `${bold(oneLine(term))}\n${oneLine(marksSlack(body))}`
    ),
    () =>
      slackRichText({
        type: 'rich_text_list',
        style: 'bullet',
        elements: items.map(({ term, body }) =>
          richTextSection(
            richTextRun(term, { bold: true }),
            richTextRun(': '),
            ...marksRichText(body)
          )
        ),
      })
  ),
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
