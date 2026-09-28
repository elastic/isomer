/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { bold, type SlackBlock } from '@elastic/isomer-sdk/slack';
import type { ZodType } from 'zod';

import type { SlideRenderScope } from '../../render/context';
import { markdownText, marksMarkdown } from '../../render/markdown';
import { marksSlack, plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { contentNode, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { sideNodes, splitBlocks } from './items';
import { react } from './react';
import { buildSchema, schema } from './schema';
import type { SlideSplitNode, SlideSplitSide } from './types';

export type { SlideSplitNode, SlideSplitSide } from './types';

const { arrowGlyph, slackBullet } = slideDistillery.tokens.split;

type TextScope = Pick<SlideRenderScope, 'renderMarkdown' | 'renderText'>;

const sideText = (
  side: SlideSplitSide,
  scope: TextScope,
  surface: 'text' | 'markdown'
): string => {
  const { label } = side;
  const blocks = splitBlocks(side)
    .map((block) => {
      if (block.kind === 'statements') {
        return block.statements
          .map(
            ({ text }) =>
              `- ${surface === 'text' ? plainText(text) : marksMarkdown(text)}`
          )
          .join('\n');
      }
      return surface === 'markdown'
        ? scope.renderMarkdown(block.node)
        : scope.renderText(block.node);
    })
    .filter(Boolean)
    .join('\n\n');
  if (!label) {
    return blocks;
  }
  return surface === 'markdown'
    ? `## ${markdownText(label)}\n\n${blocks}`
    : `${oneLine(label)}\n${blocks}`;
};

const splitText = (
  { divider, footnote, left, right }: SlideSplitNode,
  scope: TextScope,
  surface: 'text' | 'markdown'
): string =>
  [
    sideText(left, scope, surface),
    divider === 'arrow' ? arrowGlyph.value : '',
    sideText(right, scope, surface),
    footnote === undefined
      ? ''
      : surface === 'text'
        ? plainText(footnote)
        : marksMarkdown(footnote),
  ]
    .filter(Boolean)
    .join('\n\n');

const section = (text: string): SlackBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

/** Catalog, schema, and renderers for {@link SlideSplitNode}. */
export const slideSplitPrimitive = definePrimitive<SlideSplitNode>({
  type: 'slideSplit',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    buildSchema(contentNode(bodyNodeSchema)),
  renderers: {
    react,
    text: (node, { scope }) => splitText(node, scope, 'text'),
    markdown: (node, { scope }) => splitText(node, scope, 'markdown'),
    slack: ({ divider, footnote, left, right }, { collector, scope }) => [
      ...[left, right].flatMap((side, sideIndex) => [
        ...(sideIndex === 1 && divider === 'arrow'
          ? [section(arrowGlyph.value)]
          : []),
        ...splitBlocks(side).flatMap((block, index): SlackBlock[] => {
          const heading =
            index === 0 && side.label ? bold(oneLine(side.label)) : '';
          if (block.kind === 'statements') {
            return [
              section(
                [
                  heading,
                  ...block.statements.map(
                    ({ text }) =>
                      `${slackBullet.value} ${oneLine(marksSlack(text))}`
                  ),
                ]
                  .filter(Boolean)
                  .join('\n')
              ),
            ];
          }
          return [
            ...(heading ? [section(heading)] : []),
            ...scope.renderSlack(block.node, collector),
          ];
        }),
      ]),
      ...(footnote ? [section(oneLine(marksSlack(footnote)))] : []),
    ],
  },
  children: ({ left, right }) => [
    ...sideNodes(left, 'left'),
    ...sideNodes(right, 'right'),
  ],
  hasOwnContent: ({ footnote, left, right }) =>
    footnote !== undefined ||
    [left, right].some(
      ({ items, label }) =>
        label !== undefined || items.some((item) => typeof item === 'string')
    ),
});
