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
import { icon } from './icon';
import { ordinal } from './ordinal';
import { react } from './react';
import { schema, type SectionSlideNode } from './schema';
import { sectionModule } from './styles';

export type { SectionItem, SectionSlideNode } from './schema';

const { separator } = slideDistillery.tokens.section;

const heading = ({ number, title }: SectionSlideNode): string =>
  oneLine(`${number} ${separator.value} ${title}`);

export const text = ({ number, title, slides }: SectionSlideNode): string =>
  [
    oneLine(`${number} ${separator.value} ${title.toUpperCase()}`),
    ...slides.map(
      (slide, index) => `${ordinal(index)} ${plainText(slide.text)}`
    ),
  ].join('\n');

const contentsList = ({ slides }: SectionSlideNode) =>
  md.list(
    slides.map((slide) => {
      const href = lineHref(slide.href);
      return href
        ? md.paragraph(md.link(marksMarkdown(slide.text), href))
        : md.paragraph(...marksMarkdown(slide.text));
    }),
    { ordered: true }
  );

export const markdown = (node: SectionSlideNode) => [
  md.heading(1, heading(node)),
  contentsList(node),
];

/** A line links in Slack only when its href is an absolute URL, or a relative one with `baseUrl` given. */
export const slack = (
  node: SectionSlideNode,
  { baseUrl }: { baseUrl?: string } = {}
): SlackBlock[] => [
  slackHeading(heading(node)),
  slackRichText({
    type: 'rich_text_list',
    style: 'ordered',
    elements: node.slides.map((slide) =>
      richTextSection(
        ...richTextLinked(
          marksRichText(slide.text),
          lineHref(slide.href),
          baseUrl
        )
      )
    ),
  }),
];

/** Catalog, schema, and renderers for {@link SectionSlideNode}. */
export const sectionSlidePrimitive = definePrimitive({
  type: 'sectionSlide',
  catalog,
  icon,
  examples,
  schema,
  styles: [sectionModule],
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
  sanitize: (node) => ({
    ...node,
    slides: node.slides.map((slide) => {
      if (slide.href === undefined) {
        return slide;
      }
      const href = sanitizeNavigationHref(slide.href);
      if (!href) {
        const { href: _dropped, ...rest } = slide;
        return rest;
      }
      return href === slide.href ? slide : { ...slide, href };
    }),
  }),
});
