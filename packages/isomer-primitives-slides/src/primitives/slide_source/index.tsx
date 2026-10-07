/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { richTextSection, slackContext, slackRichText } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { prefix } from './prefix';
import { react } from './react';
import { schema, type SlideSourceNode } from './schema';

export type { SlideSourceNode } from './schema';

export const text = ({ text: source }: SlideSourceNode): string =>
  `${prefix} ${plainText(source)}`;

export const markdown = ({ text: source }: SlideSourceNode) => [
  md.paragraph(md.emphasis(`${prefix} `, ...marksMarkdown(source))),
];

export const slack = ({ text: source }: SlideSourceNode): SlackBlock[] => [
  slackContext(
    `${prefix} ${oneLine(marksSlack(source))}`,
    () =>
      slackRichText(
        richTextSection(richTextRun(`${prefix} `), ...marksRichText(source))
      ),
    [{ marks: source }]
  ),
];

/** Catalog, schema, and renderers for {@link SlideSourceNode}. */
export const slideSourcePrimitive = definePrimitive({
  type: 'slideSource',
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
