/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS, type SlackBlock } from './blocks';
import { containerWithChildren, isContainer } from './container';
import { degradeTable, fitsTableShape, tableCharCount } from './rich_text';
import { isUnmodeledSlackBlock } from './unmodeled';

// Slack counts table cell characters across the whole message, not per block,
// so a composition whose tables individually fit can still be rejected. In
// document order, a table is kept if its shape fits and its cells fit what the
// kept ones left.
export const enforceTableLimits = (
  blocks: readonly SlackBlock[]
): SlackBlock[] => {
  let spent = 0;
  const fit = (block: SlackBlock): SlackBlock[] => {
    if (isContainer(block)) {
      return containerWithChildren(block, block.child_blocks.flatMap(fit));
    }
    if (block.type !== 'table' || isUnmodeledSlackBlock(block)) {
      return [block];
    }
    const cost = tableCharCount(block);
    if (
      fitsTableShape(block) &&
      spent + cost <= SLACK_LIMITS.tableCellCharsPerMessage
    ) {
      spent += cost;
      return [block];
    }
    return degradeTable(block);
  };
  return blocks.flatMap(fit);
};
