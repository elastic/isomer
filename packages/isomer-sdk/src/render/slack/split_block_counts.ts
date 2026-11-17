/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS, type SlackBlock } from './blocks';
import { containerWithChildren } from './container';
import { isUnmodeledSlackBlock } from './unmodeled';

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );

// Splits a block past a count limit into blocks of its type. Only the first
// keeps a `block_id`, which Slack requires to be unique.
export const splitBlockCounts = (block: SlackBlock): SlackBlock[] => {
  if (isUnmodeledSlackBlock(block)) {
    return [block];
  }
  switch (block.type) {
    case 'container':
      return containerWithChildren(
        block,
        block.child_blocks.flatMap(splitBlockCounts)
      );
    case 'context':
      return chunks(block.elements, SLACK_LIMITS.contextElements).map(
        (elements, index) =>
          index === 0 ? { ...block, elements } : { type: 'context', elements }
      );
    case 'actions':
      return chunks(block.elements, SLACK_LIMITS.buttonsPerActions).map(
        (elements, index) =>
          index === 0 ? { ...block, elements } : { type: 'actions', elements }
      );
    case 'section': {
      if (
        !block.fields ||
        block.fields.length <= SLACK_LIMITS.fieldsPerSection
      ) {
        return [block];
      }
      return chunks(block.fields, SLACK_LIMITS.fieldsPerSection).map(
        (fields, index) =>
          index === 0 ? { ...block, fields } : { type: 'section', fields }
      );
    }
    default:
      return [block];
  }
};
