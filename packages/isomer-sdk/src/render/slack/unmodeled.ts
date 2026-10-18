/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from './blocks';

const UNMODELED = Symbol.for('elastic.isomer.slack_unmodeled_block');

const MODELED_BLOCK_TYPES: Readonly<Record<SlackBlock['type'], true>> = {
  actions: true,
  context: true,
  divider: true,
  header: true,
  image: true,
  rich_text: true,
  section: true,
  table: true,
  video: true,
};

/** Whether Isomer models Block Kit blocks of `type`, so a renderer returns them as a {@link SlackBlock} without {@link unmodeledSlackBlock}. */
export const isModeledSlackBlockType = (
  type: string
): type is SlackBlock['type'] =>
  Object.prototype.hasOwnProperty.call(MODELED_BLOCK_TYPES, type);

/**
 * A Block Kit block Isomer does not model yet, as a {@link SlackBlock} a `slack` renderer can return.
 *
 * The envelope passes it through unfitted, so Slack rejects the whole message if it breaks a limit. A literal `type` Isomer models does not compile: return that block unwrapped. Pass the block's interface as `TBlock` to check its fields.
 */
export const unmodeledSlackBlock = <
  const TBlock extends { readonly type: string },
>(
  block: TBlock &
    (TBlock['type'] extends SlackBlock['type']
      ? {
          readonly 'Isomer models this block type: return it without unmodeledSlackBlock': never;
        }
      : unknown)
): SlackBlock => ({ ...block, [UNMODELED]: true }) as unknown as SlackBlock;

/** Whether `block` came from {@link unmodeledSlackBlock}. The mark is a symbol key, so it never reaches the JSON sent to Slack. */
export const isUnmodeledSlackBlock = (block: unknown): boolean =>
  typeof block === 'object' &&
  block !== null &&
  (block as { [UNMODELED]?: unknown })[UNMODELED] === true;
