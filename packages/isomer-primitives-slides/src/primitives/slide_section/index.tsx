/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import { markdownLink } from '@elastic/isomer-sdk/markdown';
import { formatHeaderText, type SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  markdownText,
  marksMarkdown,
  marksSlack,
  plainText,
} from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideSectionNode } from './schema';

export type { SlideSectionNode } from './schema';

const { separator } = slideDistillery.tokens.frame;

const heading = ({ number, title }: SlideSectionNode): string =>
  `${number} ${separator.value} ${title}`;

/** Text renderer for {@link SlideSectionNode}. */
export const text = ({ number, title, contents }: SlideSectionNode): string =>
  [
    oneLine(`${number} ${title.toUpperCase()}`),
    ...contents.map((line, index) => `${index + 1}. ${plainText(line)}`),
  ].join('\n');

/** Markdown renderer for {@link SlideSectionNode}; a line with an `hrefs` entry is a link. */
export const markdown = (node: SlideSectionNode): string => {
  const { contents, hrefs } = node;
  const lines = contents.map((line, index) => {
    const href = hrefs?.[index];
    return `${index + 1}. ${href ? markdownLink(line, href) : marksMarkdown(line)}`;
  });
  const title = heading({
    ...node,
    number: markdownText(node.number),
    title: markdownText(node.title),
  });
  return [`# ${title}`, lines.join('\n')].join('\n\n');
};

/** Slack renderer for {@link SlideSectionNode}: a header, then the numbered lines. Slide anchors do not link in Slack. */
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
  // An unsafe href becomes `''`, so its line renders as plain text and `hrefs` keeps its length.
  sanitize: (node) =>
    node.hrefs
      ? {
          ...node,
          hrefs: node.hrefs.map((href) => sanitizeNavigationHref(href) ?? ''),
        }
      : node,
});
