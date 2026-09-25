/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boldSectionLabel } from '@elastic/isomer-sdk/markdown';

import { slideDistillery } from '../../theme/distillery';
import type { SlideBulletMarker } from '../../theme/variants';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideBulletListNode } from './schema';

export type { SlideBulletListNode } from './schema';

const { checkGlyph, crossGlyph } = slideDistillery.tokens.bullets;

const textMarkers: Record<SlideBulletMarker, string> = {
  dot: '-',
  check: checkGlyph.value,
  x: crossGlyph.value,
};

/** Text renderer for {@link SlideBulletListNode}: the caption, then one marked line per item. */
export const text = ({
  label,
  items,
  marker = 'dot',
}: SlideBulletListNode): string =>
  [
    label?.toUpperCase(),
    items.map((item) => `${textMarkers[marker]} ${item}`).join('\n'),
  ]
    .filter(Boolean)
    .join('\n');

/** Markdown renderer for {@link SlideBulletListNode}: `check` and `x` keep their glyph after the bullet. */
export const markdown = ({
  label,
  items,
  marker = 'dot',
}: SlideBulletListNode): string =>
  [
    label ? boldSectionLabel(label) : undefined,
    items
      .map((item) =>
        marker === 'dot' ? `- ${item}` : `- ${textMarkers[marker]} ${item}`
      )
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideBulletListNode}. */
export const slideBulletListPrimitive = definePrimitive({
  type: 'slideBulletList',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
