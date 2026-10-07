/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { escapeMrkdwn, link, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  richTextBreak,
  richTextLinked,
  richTextSection,
  slackBold,
  slackHeading,
  slackRichText,
  slackSection,
} from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideClosingLink, type SlideClosingNode } from './schema';

export type {
  SlideClosingLink,
  SlideClosingNode,
  SlideClosingPath,
} from './schema';

const { separator } = slideDistillery.tokens.closing;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

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
      .map(
        ({ title: goal, body }) =>
          `- ${oneLine(goal)}${termJoiner}${plainText(body)}`
      )
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
            md.paragraph(md.strong(goal), termJoiner, ...marksMarkdown(body))
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
          `${slackBold(label.toUpperCase())} ${separator.value} ${href ? link(href, oneLine(shown)) : escapeMrkdwn(oneLine(shown))}`
      )
      .join('\n'),
    () =>
      slackRichText(
        ...links.map(({ label, href, text: shown }, index) =>
          richTextSection(
            richTextRun(label.toUpperCase(), { bold: true }),
            richTextRun(` ${separator.value} `),
            ...richTextLinked([richTextRun(shown)], href),
            ...(index < links.length - 1 ? [richTextBreak] : [])
          )
        )
      ),
    links.flatMap(({ label, text: shown }) => [label, shown])
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
                  richTextRun(termJoiner),
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
  icon,
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
