/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { type SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackHeading, slackMarksSection } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  stripMarks,
} from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideHeadingNode } from './schema';

export type { SlideHeadingNode } from './schema';

export const text = ({ title, lede }: SlideHeadingNode): string =>
  [plainText(title).toUpperCase(), lede ? plainText(lede) : undefined]
    .filter(Boolean)
    .join('\n');

export const markdown = ({ title, lede }: SlideHeadingNode) => [
  md.heading(1, ...marksMarkdown(title)),
  ...(lede ? [md.paragraph(...marksMarkdown(lede))] : []),
];

export const slack = ({ title, lede }: SlideHeadingNode): SlackBlock[] => [
  slackHeading(stripMarks(title), marksRichText(title)),
  ...(lede ? [slackMarksSection(lede)] : []),
];

/** Catalog, schema, and renderers for {@link SlideHeadingNode}. */
export const slideHeadingPrimitive = definePrimitive({
  type: 'slideHeading',
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
