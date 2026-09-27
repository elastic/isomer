/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { markdownLink } from '@elastic/isomer-sdk/markdown';
import {
  bold,
  escapeMrkdwn,
  formatHeaderText,
  link,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import {
  markdownText,
  marksMarkdown,
  marksSlack,
  stripMarks,
} from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideClosingLink, type SlideClosingNode } from './schema';

export type {
  SlideClosingLink,
  SlideClosingNode,
  SlideClosingPath,
} from './schema';

const { separator } = slideDistillery.tokens.frame;

const bareAddress = (href: string): string =>
  href.replace(/^(?:https?:\/\/|mailto:)/i, '').replace(/\/$/, '');

/** A link's address for plain text, when `text` does not already show it. */
const textLink = ({ href, text: shown }: SlideClosingLink): string =>
  href && bareAddress(href) !== bareAddress(shown)
    ? `${shown} (${href})`
    : shown;

/** Text renderer for {@link SlideClosingNode}. */
export const text = ({ title, links, paths = [] }: SlideClosingNode): string =>
  [
    title.toUpperCase(),
    links.map((entry) => `${entry.label}: ${textLink(entry)}`).join('\n'),
    paths
      .map(({ title: goal, body }) => `- ${goal}: ${stripMarks(body)}`)
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Markdown renderer for {@link SlideClosingNode}. */
export const markdown = ({
  title,
  links,
  paths = [],
}: SlideClosingNode): string =>
  [
    `# ${markdownText(title)}`,
    ...links.map(
      ({ label, href, text: shown }) =>
        `**${markdownText(label)}** ${separator.value} ${href ? markdownLink(shown, href) : markdownText(shown)}`
    ),
    paths
      .map(
        ({ title: goal, body }) =>
          `- **${markdownText(goal)}**: ${marksMarkdown(body)}`
      )
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Slack renderer for {@link SlideClosingNode}: a header, the links, then the paths. */
export const slack = ({
  title,
  links,
  paths = [],
}: SlideClosingNode): SlackBlock[] => [
  {
    type: 'header',
    text: { type: 'plain_text', text: formatHeaderText(title), emoji: true },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: links
        .map(
          ({ label, href, text: shown }) =>
            `${bold(label)}  ${href ? link(href, shown) : escapeMrkdwn(shown)}`
        )
        .join('\n'),
    },
  },
  ...(paths.length > 0
    ? [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: paths
              .map(
                ({ title: goal, body }) =>
                  `• ${bold(goal)}: ${marksSlack(body)}`
              )
              .join('\n'),
          },
        } satisfies SlackBlock,
      ]
    : []),
];

/** Catalog, schema, and renderers for {@link SlideClosingNode}. */
export const slideClosingPrimitive = definePrimitive({
  type: 'slideClosing',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
  // An unsafe href becomes `''`, so its link renders as plain text.
  sanitize: (node) => ({
    ...node,
    links: node.links.map((entry) => ({
      ...entry,
      href: sanitizeNavigationHref(entry.href) ?? '',
    })),
  }),
});
