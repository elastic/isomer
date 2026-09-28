/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type SlackBlock } from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import { renderChildren, renderSlackChildren } from '../../render';
import {
  marksMarkdown,
  marksSlack,
  plainText,
  singleLine,
} from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, schemaWith, type SlideAnnotatedRenderPin } from './schema';
import type { SlideAnnotatedRenderNode } from './types';

export type { SlideAnnotatedRenderPin } from './schema';
export type { SlideAnnotatedRenderNode } from './types';

const legend = (
  pins: readonly SlideAnnotatedRenderPin[],
  line: (pin: SlideAnnotatedRenderPin) => string
): string => pins.map((pin, index) => `${index + 1}. ${line(pin)}`).join('\n');

/** Catalog, schema, and renderers for {@link SlideAnnotatedRenderNode}. */
export const slideAnnotatedRenderPrimitive =
  definePrimitive<SlideAnnotatedRenderNode>({
    type: 'slideAnnotatedRender',
    catalog,
    examples,
    schema,
    schemaFor: (bodyNodeSchema: ZodType<unknown>) => schemaWith(bodyNodeSchema),
    renderers: {
      react,
      text: ({ render, pins }, { scope }) =>
        [
          renderChildren([render], scope, 'text'),
          legend(
            pins,
            ({ title, body }) => `${plainText(title)} — ${plainText(body)}`
          ),
        ].join('\n\n'),
      markdown: ({ render, pins }, { scope }) =>
        [
          renderChildren([render], scope, 'markdown'),
          legend(
            pins,
            ({ title, body }) =>
              `**${marksMarkdown(title)}** — ${marksMarkdown(body)}`
          ),
        ].join('\n\n'),
      slack: ({ render, pins }, { collector, scope }) => [
        ...renderSlackChildren([render], scope, collector),
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: legend(
              pins,
              ({ title, body }) =>
                `*${singleLine(marksSlack(title))}* — ${singleLine(marksSlack(body))}`
            ),
          },
        } satisfies SlackBlock,
      ],
    },
    children: ({ render }) => [{ node: render, path: 'render' }],
    hasOwnContent: () => true,
  });
