/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  richTextLinked,
  richTextSection,
  slackHeading,
  slackRichText,
} from '../../render';
import { marksMarkdown, marksRichText, plainText } from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { lineHref } from './href';
import { ordinal } from './ordinal';
import { react } from './react';
import { schema, type SlideSectionNode } from './schema';

export type { SlideSectionNode } from './schema';

const { separator } = slideDistillery.tokens.section;

const heading = ({ number, title }: SlideSectionNode): string =>
  oneLine(`${number} ${separator.value} ${title}`);

export const text = ({ number, title, contents }: SlideSectionNode): string =>
  [
    oneLine(`${number} ${separator.value} ${title.toUpperCase()}`),
    ...contents.map((line, index) => `${ordinal(index)} ${plainText(line)}`),
  ].join('\n');

const contentsList = ({ contents, hrefs }: SlideSectionNode) =>
  md.list(
    contents.map((line, index) => {
      const href = lineHref(hrefs, index);
      return href
        ? md.paragraph(md.link(marksMarkdown(line), href))
        : md.paragraph(...marksMarkdown(line));
    }),
    { ordered: true }
  );

export const markdown = (node: SlideSectionNode) => [
  md.heading(1, heading(node)),
  contentsList(node),
];

/** A line links in Slack only when its href is an absolute URL. */
export const slack = (node: SlideSectionNode): SlackBlock[] => [
  slackHeading(heading(node)),
  slackRichText({
    type: 'rich_text_list',
    style: 'ordered',
    elements: node.contents.map((line, index) =>
      richTextSection(
        ...richTextLinked(marksRichText(line), lineHref(node.hrefs, index))
      )
    ),
  }),
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
