/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackMrkdwnTextObject,
  type SlackSectionBlock,
} from './blocks';
import { containerWithChildren, isContainer } from './container';
import { isUnmodeledSlackBlock } from './unmodeled';

const SLACK_SPACER_TEXT = ' ';

const slackSpacerBlock = (): SlackSectionBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text: SLACK_SPACER_TEXT },
});

export const isSpacer = (block: SlackBlock): boolean =>
  !isUnmodeledSlackBlock(block) &&
  block.type === 'section' &&
  block.text?.type === 'mrkdwn' &&
  block.text.text === SLACK_SPACER_TEXT &&
  block.fields === undefined &&
  block.accessory === undefined;

const isFieldsOnly = (
  block: SlackBlock
): block is SlackSectionBlock & { fields: SlackMrkdwnTextObject[] } =>
  !isUnmodeledSlackBlock(block) &&
  block.type === 'section' &&
  (block.fields?.length ?? 0) > 0 &&
  block.text === undefined &&
  block.accessory === undefined;

// A container sets itself apart, so no spacer goes beside it.
const isContent = (block: SlackBlock): boolean =>
  block.type !== 'container' &&
  block.type !== 'header' &&
  block.type !== 'divider' &&
  block.type !== 'actions' &&
  block.type !== 'context' &&
  !isSpacer(block);

// Consecutive 1-field sections pack into Slack's two-column `fields` grid.
// A section that already has 2+ fields is a finished batch (e.g. a
// description list) and is left alone.
export const coalesceFieldSections = (
  blocks: readonly SlackBlock[]
): SlackBlock[] => {
  const out: SlackBlock[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index]!;
    if (isFieldsOnly(block) && block.fields?.length === 1) {
      const fields = [...block.fields];
      index += 1;
      while (index < blocks.length) {
        const next = blocks[index]!;
        if (
          !isFieldsOnly(next) ||
          next.fields.length !== 1 ||
          fields.length >= SLACK_LIMITS.fieldsPerSection
        ) {
          break;
        }
        fields.push(...next.fields);
        index += 1;
      }
      out.push({ type: 'section', fields });
      continue;
    }
    out.push(
      ...(isContainer(block)
        ? containerWithChildren(
            block,
            coalesceFieldSections(block.child_blocks)
          )
        : [block])
    );
    index += 1;
  }
  return out;
};

// Divider before every section heading (and trailing actions) after the
// composition title; spacer after each content run except a table already
// about to be followed by a divider. Consecutive field-only sections are
// not spaced — they read as one grid.
export const applySectionRhythm = (
  blocks: readonly SlackBlock[]
): SlackBlock[] => {
  if (blocks.length === 0) {
    return [];
  }
  const out: SlackBlock[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const prev = out[out.length - 1];
    const needsDividerBefore =
      (block.type === 'header' && out.length > 0) || block.type === 'actions';
    if (needsDividerBefore && prev && prev.type !== 'divider') {
      if (isContent(prev) && prev.type !== 'table') {
        out.push(slackSpacerBlock());
      }
      out.push({ type: 'divider' });
    }
    out.push(block);
    if (isContent(block) && index + 1 < blocks.length) {
      const next = blocks[index + 1]!;
      if (isContent(next) && !(isFieldsOnly(block) && isFieldsOnly(next))) {
        out.push(slackSpacerBlock());
      }
    }
  }
  return out;
};
