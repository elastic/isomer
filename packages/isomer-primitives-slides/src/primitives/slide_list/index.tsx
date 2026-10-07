/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { markdownCaption, slackCaption, slackMarksContext } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideListNode } from './schema';

export type { SlideListItem, SlideListNode } from './schema';

const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

export const text = ({ label, items, footnote }: SlideListNode): string =>
  [
    label && oneLine(label).toUpperCase(),
    items
      .map(({ term, body }) =>
        term
          ? `${oneLine(term)}${termJoiner}${plainText(body)}`
          : plainText(body)
      )
      .join('\n'),
    footnote ? plainText(footnote) : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');

export const markdown = ({ label, items, footnote }: SlideListNode) => [
  ...(label ? [markdownCaption(label)] : []),
  md.list(
    items.map(({ term, body }) =>
      md.paragraph(
        ...(term ? [md.strong(term), termJoiner] : []),
        ...marksMarkdown(body)
      )
    )
  ),
  ...(footnote ? [md.paragraph(...marksMarkdown(footnote))] : []),
];

export const slack = ({
  label,
  items,
  footnote,
}: SlideListNode): SlackBlock[] => [
  ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: items.map(({ term, body }) => ({
          type: 'rich_text_section',
          elements: [
            ...(term
              ? [richTextRun(term, { bold: true }), richTextRun(termJoiner)]
              : []),
            ...marksRichText(body),
          ],
        })),
      },
    ],
  },
  ...(footnote ? [slackMarksContext(footnote)] : []),
];

/** Catalog, schema, and renderers for {@link SlideListNode}. */
export const slideListPrimitive = definePrimitive({
  type: 'slideList',
  catalog,
  icon,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
