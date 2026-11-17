/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS, type SlackBlock } from './blocks';
import { contextBlock } from './context_block';
import { italic } from './format';
import { isSpacer } from './rhythm';

const truncateWithNotice = (blocks: SlackBlock[]): SlackBlock[] => {
  const kept = blocks.slice(0, SLACK_LIMITS.blocksPerMessage - 1);
  const dropped = blocks.length - kept.length;
  kept.push(
    contextBlock([
      italic(`+${dropped} more blocks elided to fit Slack's limit.`),
    ])
  );
  return kept;
};

export const enforceBlockBudget = (blocks: SlackBlock[]): SlackBlock[] => {
  if (blocks.length <= SLACK_LIMITS.blocksPerMessage) {
    return blocks;
  }
  const trimmed = [...blocks];
  for (
    let index = trimmed.length - 1;
    index >= 0 && trimmed.length > SLACK_LIMITS.blocksPerMessage;
    index -= 1
  ) {
    if (isSpacer(trimmed[index]!)) {
      trimmed.splice(index, 1);
    }
  }
  if (trimmed.length <= SLACK_LIMITS.blocksPerMessage) {
    return trimmed;
  }
  return truncateWithNotice(trimmed);
};
