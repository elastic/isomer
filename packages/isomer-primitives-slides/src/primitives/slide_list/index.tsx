/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { boldSectionLabel } from '@elastic/isomer-sdk/markdown';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { plainText } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideListNode } from './schema';

export type { SlideListItem, SlideListNode } from './schema';

/** Text renderer for {@link SlideListNode}: caption, `term: body` rows, footnote. */
export const text = ({ label, items, footnote }: SlideListNode): string =>
  [
    label && oneLine(label).toUpperCase(),
    items
      .map(({ term, body }) =>
        term ? `${oneLine(term)}: ${plainText(body)}` : plainText(body)
      )
      .join('\n'),
    footnote ? plainText(footnote) : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');

/** Markdown renderer for {@link SlideListNode}. */
export const markdown = ({ label, items, footnote }: SlideListNode): string =>
  [
    label ? boldSectionLabel(markdownText(label)) : undefined,
    items
      .map(({ term, body }) =>
        term
          ? `- **${markdownText(term)}**: ${marksMarkdown(body)}`
          : `- ${marksMarkdown(body)}`
      )
      .join('\n'),
    footnote && marksMarkdown(footnote),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideListNode}. */
export const slideListPrimitive = definePrimitive({
  type: 'slideList',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
