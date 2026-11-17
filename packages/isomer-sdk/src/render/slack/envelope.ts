/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '../../composition/composition';
import type { PrimitiveNode } from '../../define/primitive_module';
import type { MarkdownEnvelopeDispatcher } from '../markdown/envelope';
import { renderTextEnvelope } from '../text/envelope';

import {
  createSlackAssetCollector,
  type SlackAssetCollector,
  type SlackAssetRequest,
} from './assets';
import { enforceBlockBudget } from './block_budget';
import { SLACK_LIMITS, type SlackBlock, type SlackHeaderBlock } from './blocks';
import { isContainer } from './container';
import { contextBlock } from './context_block';
import { fitBlock } from './fit_blocks';
import { enforceTableLimits } from './fit_tables';
import {
  assertSlackBaseUrl,
  clampMrkdwn,
  escapeMrkdwn,
  formatHeaderText,
  type SlackLinkOptions,
} from './format';
import { applySectionRhythm, coalesceFieldSections } from './rhythm';
import { splitBlockCounts } from './split_block_counts';

/**
 * Adds Block Kit to {@link MarkdownEnvelopeDispatcher}.
 *
 * `renderSlack` may return no blocks, in which case the node contributes
 * nothing — the envelope spreads what it is given and does not degrade. That is
 * the dispatcher's job: it renders the node's markdown instead. The markdown
 * renderer is what that fallback reads, so it stays required even for a pack
 * with full Slack coverage.
 */
export interface SlackEnvelopeDispatcher<
  TNode extends PrimitiveNode,
> extends MarkdownEnvelopeDispatcher<TNode> {
  /** `collector` is absent unless the caller opted into asset collection, so a renderer must still degrade an image it cannot upload. */
  renderSlack(
    node: TNode,
    collector?: SlackAssetCollector,
    options?: SlackLinkOptions
  ): readonly SlackBlock[];
}

/** Options for {@link renderSlackEnvelope}. */
export interface SlackEnvelopeOptions extends SlackLinkOptions {
  /** Renders the composition's title and subtitle, in the blocks and the fallback `text`. Defaults to `true`. Pass `false` when the host already shows the title, or the body opens with its own. */
  heading?: boolean;
  /** Fallback `text` summary shown in notifications and previews, as `mrkdwn`; defaults to the text render, escaped. */
  text?: string;
  /** Whether to collect image upload requests alongside the blocks. */
  collectAssets?: boolean;
}

/** What {@link renderSlackEnvelope} returns: one `chat.postMessage` payload. */
export interface SlackEnvelopeResult {
  /** Fallback text for the message. */
  text: string;
  /** Block Kit blocks, fitted to Slack's limits. */
  blocks: SlackBlock[];
  /** Images referenced by `blocks` that the host must upload first. */
  assets: SlackAssetRequest[];
}

/**
 * The composition as a `chat.postMessage` payload: notification `text`, blocks,
 * and the images the host must upload first.
 *
 * Degradation for a node with no `slack` renderer is the dispatcher's, which
 * has to own it to reach a child nested inside a container. The result is
 * fitted to Slack's limits — text is clamped, blocks past a count limit and
 * `rich_text` elements past a section's limit split, tables past a table limit
 * or the message's cell budget become rich text, spacers and then whole blocks
 * are dropped — so the output is always postable, except for a block from
 * `unmodeledSlackBlock` or of a type Isomer does not model, which passes
 * through unfitted. `assets` stays empty unless `collectAssets` is set.
 */
export const renderSlackEnvelope = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>,
  dispatcher: SlackEnvelopeDispatcher<TNode>,
  options: SlackEnvelopeOptions = {}
): SlackEnvelopeResult => {
  const blocks: SlackBlock[] = [];
  // The collector is opt-in: without it, charts keep their markdown/text
  // degradation and non-reachable images degrade to a link/text section, so
  // default output is safe for callers that cannot upload files.
  const collector = options.collectAssets
    ? createSlackAssetCollector()
    : undefined;

  const { heading = true, baseUrl } = options;
  assertSlackBaseUrl(baseUrl);
  if (heading && composition.title) {
    blocks.push(headerBlock(composition.title, 1));
  }
  if (heading && composition.subtitle) {
    blocks.push(contextBlock([escapeMrkdwn(composition.subtitle)]));
  }
  const linkOptions = baseUrl === undefined ? {} : { baseUrl };
  for (const node of composition.body) {
    blocks.push(
      ...dispatcher.renderSlack(node, collector, linkOptions).flatMap(fitBlock)
    );
  }

  // Split after the rhythm, so the fragments of one block read as one.
  const rhythm = applySectionRhythm(
    coalesceFieldSections(enforceTableLimits(blocks))
  ).flatMap(splitBlockCounts);
  const budgeted = enforceBlockBudget(rhythm);
  // Only ask the host to upload assets whose placeholder block survived the
  // budget; blocks elided by `enforceBlockBudget` are never posted, so
  // uploading their files would be wasted (and orphaned) work.
  const keptRefs = collectSlackFileRefs(budgeted);

  return {
    text: clampMrkdwn(
      options.text ??
        escapeMrkdwn(renderTextEnvelope(composition, dispatcher, { heading })),
      SLACK_LIMITS.fallbackTextChars
    ),
    blocks: budgeted,
    assets: collector
      ? collector.requests.filter((request) => keptRefs.has(request.ref))
      : [],
  };
};

const collectSlackFileRefs = (
  blocks: readonly SlackBlock[]
): ReadonlySet<string> => {
  const refs = new Set<string>();
  const visit = (block: SlackBlock): void => {
    if (block.type === 'image' && block.slack_file?.ref !== undefined) {
      refs.add(block.slack_file.ref);
    } else if (isContainer(block)) {
      block.child_blocks.forEach(visit);
    }
  };
  blocks.forEach(visit);
  return refs;
};

const headerBlock = (
  title: string,
  level?: SlackHeaderBlock['level']
): SlackHeaderBlock => ({
  type: 'header',
  text: { type: 'plain_text', text: formatHeaderText(title), emoji: true },
  ...(level !== undefined ? { level } : {}),
});
