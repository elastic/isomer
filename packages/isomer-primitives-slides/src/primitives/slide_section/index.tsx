/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { formatHeaderText, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown, marksSlack, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { lineHref } from './href';
import { react } from './react';
import { schema, type SlideSectionNode } from './schema';

export type { SlideSectionNode } from './schema';

const { separator } = slideDistillery.tokens.section;

const heading = ({ number, title }: SlideSectionNode): string =>
  oneLine(`${number} ${separator.value} ${title}`);

export const text = ({ number, title, contents }: SlideSectionNode): string =>
  [
    oneLine(`${number} ${title.toUpperCase()}`),
    ...contents.map((line, index) => `${index + 1}. ${plainText(line)}`),
  ].join('\n');

/** A line with an `hrefs` entry is a link. */
export const markdown = (node: SlideSectionNode) => [
  md.heading(1, heading(node)),
  md.list(
    node.contents.map((line, index) => {
      const href = lineHref(node.hrefs, index);
      return href
        ? md.paragraph(md.link(marksMarkdown(line), href))
        : md.paragraph(...marksMarkdown(line));
    }),
    { ordered: true }
  ),
];

/** Slide anchors do not link in Slack. */
export const slack = (node: SlideSectionNode): SlackBlock[] => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: formatHeaderText(heading(node)),
      emoji: true,
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: node.contents
        .map((line, index) => `${index + 1}. ${oneLine(marksSlack(line))}`)
        .join('\n'),
    },
  },
];

/** Catalog, schema, and renderers for {@link SlideSectionNode}. */
export const slideSectionPrimitive = definePrimitive({
  type: 'slideSection',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
  // An unsafe href becomes `''`: its line renders as plain text and `hrefs` keeps its length.
  sanitize: (node) =>
    node.hrefs
      ? {
          ...node,
          hrefs: node.hrefs.map((href) => sanitizeNavigationHref(href) ?? ''),
        }
      : node,
});
