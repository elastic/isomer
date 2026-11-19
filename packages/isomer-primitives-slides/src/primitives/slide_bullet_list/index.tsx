/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { withBuild } from '../../builds/types';
import { markdownCaption, slackLabelCaption, textCaption } from '../../render';
import { marksMarkdown, marksRichText, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import type { SlideBulletMarker } from '../../theme/variants';
import { definePrimitive } from '../define';

import { bulletListBuild } from './build';
import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideBulletListNode } from './schema';

export type { SlideBulletListNode } from './schema';

const { checkGlyph, crossGlyph, dotGlyph } = slideDistillery.tokens.bulletList;

const glyphs: Record<SlideBulletMarker, string> = {
  dot: dotGlyph.value,
  check: checkGlyph.value,
  x: crossGlyph.value,
};

/** `check` and `x` keep their glyph after the bullet. */
const itemPrefix = (marker: SlideBulletMarker): string[] =>
  marker === 'dot' ? [] : [`${glyphs[marker]} `];

export const text = ({
  label,
  items,
  marker = 'dot',
}: SlideBulletListNode): string =>
  [
    label && textCaption(label),
    items.map((item) => `${glyphs[marker]} ${plainText(item)}`).join('\n'),
  ]
    .filter(Boolean)
    .join('\n');

export const markdown = ({
  label,
  items,
  marker = 'dot',
}: SlideBulletListNode) => [
  ...(label ? [markdownCaption(label)] : []),
  md.list(
    items.map((item) =>
      md.paragraph(...itemPrefix(marker), ...marksMarkdown(item))
    )
  ),
];

export const slack = ({
  label,
  items,
  marker = 'dot',
}: SlideBulletListNode): SlackBlock[] => [
  ...(label ? [slackLabelCaption(label)] : []),
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: items.map((item) => ({
          type: 'rich_text_section',
          elements: [
            ...itemPrefix(marker).map((prefix) => ({
              type: 'text' as const,
              text: prefix,
            })),
            ...marksRichText(item),
          ],
        })),
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideBulletListNode}. */
export const slideBulletListPrimitive = withBuild(
  definePrimitive({
    type: 'slideBulletList',
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
  }),
  bulletListBuild
);
