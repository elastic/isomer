/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackContainerBlock,
  type SlackContainerChildBlock,
  type SlackHeaderLevel,
} from './blocks';
import { formatHeaderText } from './format';
import { isUnmodeledSlackBlock } from './unmodeled';

/** Options for {@link slackContainer}: the container's optional fields, and the level of the `header` it falls back to. */
export type SlackContainerOptions = Partial<
  Pick<
    SlackContainerBlock,
    | 'block_id'
    | 'subtitle'
    | 'icon'
    | 'width'
    | 'is_collapsible'
    | 'default_collapsed'
    | 'has_header_divider'
  >
> & { fallbackLevel?: SlackHeaderLevel };

/** A container Isomer fits, as opposed to one passed through `unmodeledSlackBlock`. */
export const isContainer = (block: SlackBlock): block is SlackContainerBlock =>
  block.type === 'container' && !isUnmodeledSlackBlock(block);

/** A container as the blocks it holds, led by its title and subtitle. */
export const unwrapContainer = (
  { title, rich_text_title, subtitle, child_blocks }: SlackContainerBlock,
  level?: SlackHeaderLevel
): SlackContainerChildBlock[] => [
  ...(rich_text_title
    ? [rich_text_title]
    : title
      ? [
          {
            type: 'header' as const,
            text: title,
            ...(level === undefined ? {} : { level }),
          },
        ]
      : []),
  ...(subtitle ? [{ type: 'context' as const, elements: [subtitle] }] : []),
  ...child_blocks,
];

/**
 * `container` holding `children`, with any nested container unwrapped, since
 * Slack rejects one. A container left with no children, or more than
 * `containerChildBlocks`, is unwrapped itself.
 */
export const containerWithChildren = (
  container: SlackContainerBlock,
  children: readonly SlackBlock[],
  level?: SlackHeaderLevel
): SlackBlock[] => {
  const child_blocks = children.flatMap((child) =>
    isContainer(child) ? unwrapContainer(child) : [child]
  );
  const refitted = { ...container, child_blocks };
  return child_blocks.length === 0 ||
    child_blocks.length > SLACK_LIMITS.containerChildBlocks
    ? unwrapContainer(refitted, level)
    : [refitted];
};

/**
 * A titled section as one Block Kit `container`, from its title and the
 * blocks its body rendered to, typically through `scope.renderSlack`.
 *
 * A nested container among `children` is unwrapped to its title and blocks.
 * With no children, or more than `SLACK_LIMITS.containerChildBlocks`, the
 * section falls back to a `header` at `fallbackLevel` followed by the blocks.
 */
export const slackContainer = (
  title: string,
  children: readonly SlackBlock[],
  { fallbackLevel, ...fields }: SlackContainerOptions = {}
): SlackBlock[] =>
  containerWithChildren(
    {
      type: 'container',
      title: { type: 'plain_text', text: formatHeaderText(title), emoji: true },
      ...fields,
      child_blocks: [],
    },
    children,
    fallbackLevel
  );
