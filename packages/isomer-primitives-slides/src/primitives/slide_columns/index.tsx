/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { markdownCode, marksMarkdown } from '../../render/markdown';
import { plainText } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideColumnsNode } from './schema';

export type { SlideColumn, SlideColumnsNode } from './schema';

/** Text renderer for {@link SlideColumnsNode}: each column as a block, then the footnote. */
export const text = ({ items, footnote }: SlideColumnsNode): string =>
  [
    ...items.map(({ title, tags = [], body }) =>
      [
        tags.length > 0
          ? `${plainText(title)} (${tags.map(oneLine).join(', ')})`
          : plainText(title),
        plainText(body),
      ].join('\n')
    ),
    footnote ? `${oneLine(footnote.code)} ${plainText(footnote.text)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** Markdown renderer for {@link SlideColumnsNode}: a heading per column, tags as code. */
export const markdown = ({ items, footnote }: SlideColumnsNode): string =>
  [
    ...items.map(({ title, tags = [], body }) =>
      [
        `## ${marksMarkdown(title)}`,
        tags.map((tag) => markdownCode(tag)).join(' '),
        marksMarkdown(body),
      ]
        .filter(Boolean)
        .join('\n\n')
    ),
    footnote
      ? `${markdownCode(footnote.code)} ${marksMarkdown(footnote.text)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideColumnsNode}. */
export const slideColumnsPrimitive = definePrimitive({
  type: 'slideColumns',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
