/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import {
  escapeMrkdwn,
  type SlackAssetCollector,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import type { SlideRenderScope } from './context';

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

/** A container's Slack blocks: each child through `scope`, so a native renderer below is reached. */
export const renderSlackChildren = (
  nodes: readonly PrimitiveNode[],
  scope: Pick<SlideRenderScope, 'renderSlack'>,
  collector: SlackAssetCollector | undefined
): SlackBlock[] => nodes.flatMap((node) => scope.renderSlack(node, collector));

/** A one-line `context` block: the chrome a container draws above its children. */
export const slackCaption = (text: string, strong = false): SlackBlock => ({
  type: 'context',
  elements: [
    {
      type: 'mrkdwn',
      text: strong ? `*${escapeMrkdwn(text)}*` : escapeMrkdwn(text),
    },
  ],
});
