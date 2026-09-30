/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { bold, escapeMrkdwn, SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import { fitsSlack, richTextSection, slackRichText } from '../../render';
import { richTextRun } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';
import {
  embeddedMarkdown,
  embeddedSlack,
  embeddedText,
} from '../slide_render/output';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { buildSchema, schema } from './schema';
import type { SlideRenderGridNode } from './types';

export type { SlideRenderGridNode, SlideRenderGridTile } from './types';

const join = ` ${slideDistillery.tokens.render.separator.value} `;

/** Catalog, schema, and renderers for {@link SlideRenderGridNode}. */
export const slideRenderGridPrimitive = definePrimitive<SlideRenderGridNode>({
  type: 'slideRenderGrid',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) => buildSchema(bodyNodeSchema),
  renderers: {
    react,
    text: ({ body, tiles }, { scope }) =>
      [
        tiles
          .map(({ surface, caption }) => `${surface}${join}${oneLine(caption)}`)
          .join('\n'),
        embeddedText(body, 'react', scope),
      ].join('\n\n'),
    markdown: ({ body, tiles }, { scope }) => [
      md.list(
        tiles.map(({ surface, caption }) =>
          md.paragraph(md.strong(surface), join, caption)
        )
      ),
      embeddedMarkdown(body, 'react', scope),
    ],
    slack: ({ body, tiles }, { collector, scope }) => {
      const texts = tiles.map(
        ({ surface, caption }) =>
          `${bold(surface)}${join}${escapeMrkdwn(oneLine(caption))}`
      );
      return [
        texts.every((text) => fitsSlack(text, SLACK_LIMITS.contextElementChars))
          ? {
              type: 'context',
              elements: texts.map((text) => ({ type: 'mrkdwn', text })),
            }
          : slackRichText(
              ...tiles.map(({ surface, caption }) =>
                richTextSection(
                  richTextRun(surface, { bold: true }),
                  richTextRun(`${join}${caption}`)
                )
              )
            ),
        ...embeddedSlack(body, 'react', scope, collector),
      ];
    },
  },
});
