/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown } from '../../render/markdown';
import { marksSlack, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideSourceNode } from './schema';

export type { SlideSourceNode } from './schema';

const { prefix } = slideDistillery.tokens.source;

/** Text renderer for {@link SlideSourceNode}. */
export const text = ({ text: source }: SlideSourceNode): string =>
  `${prefix.value} ${plainText(source)}`;

/** Markdown renderer for {@link SlideSourceNode}: one italic line. */
export const markdown = ({ text: source }: SlideSourceNode): string =>
  `_${prefix.value} ${marksMarkdown(source)}_`;

/** Slack renderer for {@link SlideSourceNode}: a context block. */
export const slack = ({ text: source }: SlideSourceNode): SlackBlock[] => [
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${prefix.value} ${oneLine(marksSlack(source))}`,
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideSourceNode}. */
export const slideSourcePrimitive = definePrimitive({
  type: 'slideSource',
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
