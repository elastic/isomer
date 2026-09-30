/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { ZodType } from 'zod';

import {
  renderMarkdownChildren,
  renderSlackChildren,
  renderTextChildren,
  slackCaption,
  slackMarksSection,
} from '../../render';
import { marksMarkdown, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { contentNode, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { buildSchema, panesField, schema } from './schema';
import type { SlideSplitNode } from './types';

export type { SlideSplitNode, SlideSplitPane } from './types';

const arrowGlyph = slideDistillery.tokens.split.arrowGlyph.value;

/** Catalog, schema, and renderers for {@link SlideSplitNode}. */
export const slideSplitPrimitive = definePrimitive<
  SlideSplitNode,
  typeof schema
>({
  type: 'slideSplit',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    buildSchema(panesField(contentNode(bodyNodeSchema))),
  renderers: {
    react,
    text: ({ divider, footnote, panes }, { scope }) =>
      [
        ...panes.flatMap(({ label, items }, index) => [
          index > 0 && divider === 'arrow' ? arrowGlyph : '',
          [
            label ? oneLine(label).toUpperCase() : '',
            renderTextChildren(items, scope),
          ]
            .filter(Boolean)
            .join('\n'),
        ]),
        footnote ? plainText(footnote) : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: ({ divider, footnote, panes }, { scope }) => [
      ...panes.flatMap(({ label, items }, index) => [
        ...(index > 0 && divider === 'arrow' ? [md.paragraph(arrowGlyph)] : []),
        ...(label ? [md.heading(2, label)] : []),
        renderMarkdownChildren(items, scope),
      ]),
      ...(footnote ? [md.paragraph(...marksMarkdown(footnote))] : []),
    ],
    slack: ({ divider, footnote, panes }, { collector, scope }) => [
      ...panes.flatMap(({ label, items }, index) => [
        ...(index > 0 && divider === 'arrow' ? [slackCaption(arrowGlyph)] : []),
        ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
        ...renderSlackChildren(items, scope, collector),
      ]),
      ...(footnote ? [slackMarksSection(footnote)] : []),
    ],
  },
  children: ({ panes }) =>
    panes.flatMap(({ items }, pane) =>
      items.map((node, index) => ({
        node,
        path: `panes[${pane}].items[${index}]`,
      }))
    ),
  hasOwnContent: ({ footnote, panes }) =>
    footnote !== undefined || panes.some(({ label }) => label !== undefined),
});
