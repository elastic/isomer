/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import {
  formatHeaderText,
  italic,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import { renderSlackChildren, slackCaption } from '../../render';
import {
  markdownText,
  marksMarkdown,
  marksSlack,
  plainText,
} from '../../render/marks';
import { contentNode, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema } from './schema';
import type { SlideTitleNode } from './types';

export type { SlideTitleDefinition, SlideTitleNode } from './types';

const ownText = ({ eyebrow, title, tagline, definition }: SlideTitleNode) =>
  [
    eyebrow && oneLine(eyebrow).toUpperCase(),
    oneLine(title),
    tagline && plainText(tagline),
    definition
      ? `${oneLine(definition.term)} ${plainText(definition.text)}`
      : undefined,
  ]
    .filter(Boolean)
    .join('\n');

const ownMarkdown = ({ eyebrow, title, tagline, definition }: SlideTitleNode) =>
  [
    `# ${markdownText(title)}`,
    eyebrow ? `_${markdownText(eyebrow)}_` : undefined,
    tagline && marksMarkdown(tagline),
    definition
      ? `_${markdownText(definition.term)}_ ${marksMarkdown(definition.text)}`
      : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideTitleNode}. */
export const slideTitlePrimitive = definePrimitive<SlideTitleNode>({
  type: 'slideTitle',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({
      aside: contentNode(bodyNodeSchema)
        .describe(schema.shape.aside.unwrap().description ?? '')
        .optional(),
    }),
  renderers: {
    react,
    text: (node, { scope }) =>
      [ownText(node), node.aside ? scope.renderText(node.aside) : '']
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) =>
      [ownMarkdown(node), node.aside ? scope.renderMarkdown(node.aside) : '']
        .filter(Boolean)
        .join('\n\n'),
    slack: (node, { collector, scope }) => {
      const { eyebrow, title, tagline, definition, aside } = node;
      return [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: formatHeaderText(title),
            emoji: true,
          },
        },
        ...(eyebrow ? [slackCaption(eyebrow, true)] : []),
        ...(tagline
          ? [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: oneLine(marksSlack(tagline)) },
              } satisfies SlackBlock,
            ]
          : []),
        ...(definition
          ? [
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `${italic(oneLine(definition.term))} ${oneLine(marksSlack(definition.text))}`,
                  },
                ],
              } satisfies SlackBlock,
            ]
          : []),
        ...(aside ? renderSlackChildren([aside], scope, collector) : []),
      ];
    },
  },
  children: ({ aside }) => (aside ? [{ node: aside, path: 'aside' }] : []),
  hasOwnContent: () => true,
});
