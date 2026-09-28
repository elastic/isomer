/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import {
  escapeMrkdwn,
  type SlackAssetCollector,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import type { SlideRenderScope } from './context';
import { LINE_TERMINATORS } from './marks';

/** A container's text or markdown: each child rendered, empties dropped, blank-line joined. */
export const renderChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderMarkdown' | 'renderText'>,
  surface: 'markdown' | 'text'
): string =>
  nodes
    .map((node) =>
      surface === 'text' ? scope.renderText(node) : scope.renderMarkdown(node)
    )
    .filter(Boolean)
    .join('\n\n');

/** Markdown as a blockquote, so an embedded document's headings stay out of the outer outline. */
export const quoteMarkdown = (markdown: string): string =>
  markdown
    .split(LINE_TERMINATORS)
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');

/** A container's Slack blocks: each child through `scope`, so a native renderer below is reached. */
export const renderSlackChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderSlack'>,
  collector: SlackAssetCollector | undefined
): SlackBlock[] => nodes.flatMap((node) => scope.renderSlack(node, collector));

/** An embedded document's blocks with each `header` as a bold `section`, so the outer message keeps one header. */
export const quoteSlackBlocks = (blocks: readonly SlackBlock[]): SlackBlock[] =>
  blocks.map((block) =>
    block.type === 'header'
      ? {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${escapeMrkdwn(block.text.text)}*` },
        }
      : block
  );

/** Text indented two spaces, so an embedded document reads as set apart. */
export const quoteText = (text: string): string =>
  text
    .split(LINE_TERMINATORS)
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');

/** A one-line `context` block: the chrome a container draws above its children. */
export const slackCaption = (text: string, strong = false): SlackBlock => {
  const line = escapeMrkdwn(oneLine(text));
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: strong ? `*${line}*` : line }],
  };
};
