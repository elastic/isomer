/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  bold,
  escapeMrkdwn,
  link,
  markdownContentToSlackBlocks,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { slackHeading, slackRichText, slackSection } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
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

const { separator } = slideDistillery.tokens.closing;

const bareAddress = (href: string): string =>
  href.replace(/^(?:https?:\/\/|mailto:)/i, '').replace(/\/$/, '');

/** A link's address for plain text, when `text` does not already show it. */
const textLink = ({ href, text: shown }: SlideClosingLink): string =>
  href && bareAddress(href) !== bareAddress(shown)
    ? `${shown} (${href})`
    : shown;

export const text = ({ title, links, paths = [] }: SlideClosingNode): string =>
  [
    oneLine(title).toUpperCase(),
    links
      .map((entry) =>
        oneLine(
          `${entry.label.toUpperCase()} ${separator.value} ${textLink(entry)}`
        )
      )
      .join('\n'),
    paths
      .map(({ title: goal, body }) => `- ${oneLine(goal)}: ${plainText(body)}`)
      .join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

const linkParagraphs = (links: readonly SlideClosingLink[]) =>
  links.map(({ label, href, text: shown }) =>
    md.paragraph(
      md.strong(label.toUpperCase()),
      ` ${separator.value} `,
      href ? md.link(shown, href) : shown
    )
  );

export const markdown = ({ title, links, paths = [] }: SlideClosingNode) => [
  md.heading(1, title),
  ...linkParagraphs(links),
  ...(paths.length > 0
    ? [
        md.list(
          paths.map(({ title: goal, body }) =>
            md.paragraph(md.strong(goal), ': ', ...marksMarkdown(body))
          )
        ),
      ]
    : []),
];

export const slack = ({
  title,
  links,
  paths = [],
}: SlideClosingNode): SlackBlock[] => [
  slackHeading(title),
  slackSection(
    links
      .map(
        ({ label, href, text: shown }) =>
          `${bold(oneLine(label).toUpperCase())} ${separator.value} ${href ? link(href, oneLine(shown)) : escapeMrkdwn(oneLine(shown))}`
      )
      .join('\n'),
    () =>
      slackRichText(
        ...markdownContentToSlackBlocks(linkParagraphs(links)).flatMap(
          (block) => (block.type === 'rich_text' ? block.elements : [])
        )
      )
  ),
  ...(paths.length > 0
    ? [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_list',
              style: 'bullet',
              elements: paths.map(({ title: goal, body }) => ({
                type: 'rich_text_section',
                elements: [
                  richTextRun(goal, { bold: true }),
                  richTextRun(': '),
                  ...marksRichText(body),
                ],
              })),
            },
          ],
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
