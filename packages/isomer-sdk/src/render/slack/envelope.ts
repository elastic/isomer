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
import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackContextBlock,
  type SlackHeaderBlock,
  type SlackMrkdwnTextObject,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackSectionBlock,
  type SlackTableBlock,
  type SlackTableCell,
} from './blocks';
import {
  bold,
  clampSlackText,
  escapeMrkdwn,
  formatHeaderText,
  italic,
} from './format';

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
    collector?: SlackAssetCollector
  ): readonly SlackBlock[];
}

/** Options for {@link renderSlackEnvelope}. */
export interface SlackEnvelopeOptions {
  /** Fallback `text` summary shown in notifications and previews; defaults to the text render. */
  text?: string;
  /** Whether to collect image upload requests alongside the blocks. */
  collectAssets?: boolean;
  /** Prefix for allocated asset refs. Distinct prefixes keep merged inventories unique. */
  assetPrefix?: string;
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
 * fitted to Slack's limits — oversized tables
 * become sections, spacers and then whole blocks are dropped — so the output is
 * always postable. `assets` stays empty unless `collectAssets` is set.
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
    ? createSlackAssetCollector(
        options.assetPrefix === undefined ? {} : { prefix: options.assetPrefix }
      )
    : undefined;

  if (composition.title) {
    blocks.push(headerBlock(composition.title, 1));
  }
  if (composition.subtitle) {
    blocks.push(contextBlock([escapeMrkdwn(composition.subtitle)]));
  }
  for (const node of composition.body) {
    blocks.push(
      ...clampAssetImageAlts(dispatcher.renderSlack(node, collector))
    );
  }

  const rhythm = applySectionRhythm(
    coalesceFieldSections(enforceTableCharBudget(blocks))
  );
  const budgeted = enforceBlockBudget(rhythm);
  // Only ask the host to upload assets whose placeholder block survived the
  // budget; blocks elided by `enforceBlockBudget` are never posted, so
  // uploading their files would be wasted (and orphaned) work.
  const keptRefs = collectSlackFileRefs(budgeted);

  return {
    text: clampSlackText(
      options.text ?? renderTextEnvelope(composition, dispatcher),
      SLACK_LIMITS.fallbackTextChars
    ),
    blocks: budgeted,
    assets: collector
      ? collector.requests.filter((request) => keptRefs.has(request.ref))
      : [],
  };
};

const clampAssetImageAlts = (blocks: readonly SlackBlock[]): SlackBlock[] =>
  blocks.map((block) => {
    if (block.type !== 'image' || block.slack_file?.ref === undefined) {
      return block;
    }
    return {
      ...block,
      alt_text: clampSlackText(block.alt_text, SLACK_LIMITS.imageAltTextChars),
    };
  });

const collectSlackFileRefs = (
  blocks: readonly SlackBlock[]
): ReadonlySet<string> => {
  const refs = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'image' && block.slack_file?.ref !== undefined) {
      refs.add(block.slack_file.ref);
    }
  }
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

const contextBlock = (lines: ReadonlyArray<string>): SlackContextBlock => ({
  type: 'context',
  elements: lines
    .filter((line): line is string => line !== undefined && line.length > 0)
    .map((text) => ({
      type: 'mrkdwn',
      text: clampSlackText(text, SLACK_LIMITS.contextElementChars),
    })),
});

const SLACK_SPACER_TEXT = ' ';

const slackSpacerBlock = (): SlackSectionBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text: SLACK_SPACER_TEXT },
});

const isSpacer = (block: SlackBlock): boolean =>
  block.type === 'section' &&
  block.text?.type === 'mrkdwn' &&
  block.text.text === SLACK_SPACER_TEXT &&
  block.fields === undefined &&
  block.accessory === undefined;

const isFieldsOnly = (
  block: SlackBlock
): block is SlackSectionBlock & { fields: SlackMrkdwnTextObject[] } =>
  block.type === 'section' &&
  (block.fields?.length ?? 0) > 0 &&
  block.text === undefined &&
  block.accessory === undefined;

const isContent = (block: SlackBlock): boolean =>
  block.type !== 'header' &&
  block.type !== 'divider' &&
  block.type !== 'actions' &&
  block.type !== 'context' &&
  !isSpacer(block);

// Consecutive 1-field sections pack into Slack's two-column `fields` grid.
// A section that already has 2+ fields is a finished batch (e.g. a
// description list) and is left alone.
const coalesceFieldSections = (blocks: readonly SlackBlock[]): SlackBlock[] => {
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
    out.push(block);
    index += 1;
  }
  return out;
};

// Divider before every section heading (and trailing actions) after the
// composition title; spacer after each content run except a table already
// about to be followed by a divider. Consecutive field-only sections are
// not spaced — they read as one grid.
const applySectionRhythm = (blocks: readonly SlackBlock[]): SlackBlock[] => {
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

const richTextInlineText = (inline: SlackRichTextInline): string =>
  inline.type === 'link' ? (inline.text ?? inline.url) : inline.text;

const richTextElementText = (element: SlackRichTextBlockElement): string =>
  element.type === 'rich_text_list'
    ? element.elements.map(richTextElementText).join('')
    : element.elements.map(richTextInlineText).join('');

const tableCellText = (cell: SlackTableCell): string =>
  cell.type === 'raw_text'
    ? cell.text
    : cell.elements.map(richTextElementText).join('');

const tableCharCount = (block: SlackTableBlock): number =>
  block.rows.reduce(
    (total, row) =>
      total + row.reduce((sum, cell) => sum + tableCellText(cell).length, 0),
    0
  );

// A table over the message-wide cell budget degrades to one mrkdwn section per
// row, keyed by the header row, rather than costing the caller the whole
// message: Slack rejects the payload outright once the aggregate is exceeded.
const degradeTableToSections = (block: SlackTableBlock): SlackBlock[] => {
  const [header, ...rows] = block.rows;
  if (!header) {
    return [];
  }
  const labels = header.map((cell) => tableCellText(cell));
  const section = (text: string): SlackSectionBlock => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: clampSlackText(text, SLACK_LIMITS.sectionTextChars),
    },
  });
  if (rows.length === 0) {
    return [section(labels.map(bold).join(' · '))];
  }
  return rows.map((row) =>
    section(
      labels
        .map((label, index) => {
          const cell = row[index];
          const value = cell ? escapeMrkdwn(tableCellText(cell)) : '';
          return `${bold(label)}: ${value}`;
        })
        .join('\n')
    )
  );
};

// Slack counts table cell characters across the whole message, not per block,
// so a composition whose tables individually fit can still be rejected. Tables
// are kept in document order until the budget runs out; the rest degrade.
const enforceTableCharBudget = (
  blocks: readonly SlackBlock[]
): SlackBlock[] => {
  const total = blocks.reduce(
    (sum, block) =>
      block.type === 'table' ? sum + tableCharCount(block) : sum,
    0
  );
  if (total <= SLACK_LIMITS.tableCellCharsPerMessage) {
    return [...blocks];
  }
  const out: SlackBlock[] = [];
  let spent = 0;
  for (const block of blocks) {
    if (block.type !== 'table') {
      out.push(block);
      continue;
    }
    const cost = tableCharCount(block);
    if (spent + cost <= SLACK_LIMITS.tableCellCharsPerMessage) {
      spent += cost;
      out.push(block);
      continue;
    }
    out.push(...degradeTableToSections(block));
  }
  return out;
};

const enforceBlockBudget = (blocks: SlackBlock[]): SlackBlock[] => {
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
