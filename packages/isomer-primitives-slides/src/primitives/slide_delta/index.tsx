/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun as run,
  strongMarksMarkdown,
  strongMarksRichText,
} from '../../render/marks';
import { pending } from '../../render/pending';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideDeltaNode } from './schema';

export type { SlideDeltaNode, SlideDeltaPoint } from './schema';

const arrow = ` ${slideDistillery.tokens.delta.arrow.value} `;

/** `Before 13 → After 26. +13: body` */
export const text = ({ before, after, change, body }: SlideDeltaNode): string =>
  [before, after]
    .map(
      ({ label, value }) =>
        `${plainText(label)} ${value ? oneLine(value) : pending.text}`
    )
    .join(arrow) +
  `. ${change ? `${oneLine(change)}: ` : ''}${plainText(body)}`;

export const markdown = ({ before, after, change, body }: SlideDeltaNode) =>
  md.paragraph(
    strongMarksMarkdown(before.label),
    ' ',
    before.value ?? pending.markdown,
    arrow,
    strongMarksMarkdown(after.label),
    ' ',
    after.value ?? pending.markdown,
    '. ',
    ...(change ? [md.strong(change), ': '] : []),
    ...marksMarkdown(body)
  );

export const slack = ({
  before,
  after,
  change,
  body,
}: SlideDeltaNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          ...[before, after].flatMap(({ label, value }, index) => [
            ...(index > 0 ? [run(arrow)] : []),
            ...strongMarksRichText(label),
            run(' '),
            value ? run(value) : pending.richText,
          ]),
          run('. '),
          ...(change ? [run(change, { bold: true }), run(': ')] : []),
          ...marksRichText(body),
        ],
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideDeltaNode}. */
export const slideDeltaPrimitive = definePrimitive({
  type: 'slideDelta',
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
