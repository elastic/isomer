/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import type { MarkdownContent } from '@elastic/isomer-sdk/markdown';
import {
  escapeMrkdwn,
  type SlackAssetCollector,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import type { SlideRenderScope } from './context';
import { richTextRun } from './marks';
import {
  hasMrkdwnDelimiter,
  richTextSection,
  slackBold,
  slackContext,
  slackRichText,
} from './slack_text';

/** Each child rendered, empties dropped, blank-line joined. */
export const renderTextChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderText'>
): string =>
  nodes
    .map((node) => scope.renderText(node))
    .filter(Boolean)
    .join('\n\n');

export const renderMarkdownChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderMarkdownContent'>
): MarkdownContent => nodes.map((node) => scope.renderMarkdownContent(node));

/** Each child through `scope`, so a native renderer below is reached. */
export const renderSlackChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderSlack'>,
  collector: SlackAssetCollector | undefined
): SlackBlock[] => nodes.flatMap((node) => scope.renderSlack(node, collector));

/** The chrome a container draws above its children: a one-line `context` block, or literal rich text when `text` holds a `mrkdwn` delimiter or outgrows the block. */
export const slackCaption = (text: string, strong = false): SlackBlock => {
  const literal = () =>
    slackRichText(
      richTextSection(richTextRun(text, strong ? { bold: true } : undefined))
    );
  return hasMrkdwnDelimiter(text)
    ? literal()
    : slackContext(
        strong ? slackBold(text) : escapeMrkdwn(oneLine(text)),
        literal
      );
};
