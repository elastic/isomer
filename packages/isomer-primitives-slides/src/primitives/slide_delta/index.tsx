/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import {
  markdownText,
  marksMarkdown,
  plainText,
  stripMarks,
} from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideDeltaNode, type SlideDeltaPoint } from './schema';

export type { SlideDeltaNode, SlideDeltaPoint } from './schema';

const { arrow, placeholderCaption } = slideDistillery.tokens.delta;

interface Format {
  label: (label: string) => string;
  value: (value: string) => string;
  pending: string;
  change: (change: string) => string;
  body: (body: string) => string;
}

const line = (
  { before, after, change, body }: SlideDeltaNode,
  format: Format
): string => {
  const side = ({ label, value }: SlideDeltaPoint) =>
    `${format.label(label)} ${value ? format.value(value) : format.pending}`;
  return `${side(before)} ${arrow.value} ${side(after)}. ${
    change ? `${format.change(change)}: ` : ''
  }${format.body(body)}`;
};

/** Text renderer for {@link SlideDeltaNode}: `Before 13 → After 26. +13: body`. */
export const text = (node: SlideDeltaNode): string =>
  line(node, {
    label: plainText,
    value: oneLine,
    pending: `[${placeholderCaption.value}]`,
    change: oneLine,
    body: plainText,
  });

/** Markdown renderer for {@link SlideDeltaNode}: the text line with the labels and the change in bold. */
export const markdown = (node: SlideDeltaNode): string =>
  line(node, {
    label: (label) => `**${markdownText(stripMarks(label))}**`,
    value: markdownText,
    pending: `_${placeholderCaption.value}_`,
    change: (change) => `**${markdownText(change)}**`,
    body: marksMarkdown,
  });

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
  },
});
