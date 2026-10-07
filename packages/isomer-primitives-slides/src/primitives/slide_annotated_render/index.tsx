/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import {
  marksMarkdown,
  marksRichText,
  marksSlack,
  plainText,
  richTextRun,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import {
  richTextSection,
  slackBold,
  slackRichText,
  slackSection,
} from '../../render/slack_text';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';
import { slideRenderPrimitive } from '../slide_render';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { buildSchema, schema, type SlideAnnotatedRenderPin } from './schema';
import type { SlideAnnotatedRenderNode } from './types';

export type { SlideAnnotatedRenderPin } from './schema';
export type { SlideAnnotatedRenderNode } from './types';

const dash = ` ${slideDistillery.tokens.glyph.dash.value} `;

const richLegend = (pins: readonly SlideAnnotatedRenderPin[]): SlackBlock =>
  slackRichText({
    type: 'rich_text_list',
    style: 'ordered',
    elements: pins.map(({ title, body }) =>
      richTextSection(
        richTextRun(title, { bold: true }),
        richTextRun(dash),
        ...marksRichText(body)
      )
    ),
  });

/** Catalog, schema, and renderers for {@link SlideAnnotatedRenderNode}. */
export const slideAnnotatedRenderPrimitive =
  definePrimitive<SlideAnnotatedRenderNode>({
    type: 'slideAnnotatedRender',
    catalog,
    icon,
    examples,
    schema,
    schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
      buildSchema(slideRenderPrimitive.schemaFor!(bodyNodeSchema)),
    renderers: {
      react,
      text: ({ render, pins }, { scope }) =>
        [
          scope.renderText(render),
          pins
            .map(
              ({ title, body }, index) =>
                `${index + 1}. ${oneLine(title)}${dash}${plainText(body)}`
            )
            .join('\n'),
        ]
          .filter(Boolean)
          .join('\n\n'),
      markdown: ({ render, pins }, { scope }) => [
        scope.renderMarkdownContent(render),
        md.list(
          pins.map(({ title, body }) =>
            md.paragraph(md.strong(title), dash, ...marksMarkdown(body))
          ),
          { ordered: true }
        ),
      ],
      slack: ({ render, pins }, { collector, scope }) => [
        ...scope.renderSlack(render, collector),
        slackSection(
          pins
            .map(
              ({ title, body }, index) =>
                `${index + 1}. ${slackBold(title)}${dash}${oneLine(marksSlack(body))}`
            )
            .join('\n'),
          () => richLegend(pins),
          pins.flatMap(({ title, body }) => [title, { marks: body }])
        ),
      ],
    },
    children: ({ render }) => [{ node: render, path: 'render' }],
    hasOwnContent: () => true,
  });
