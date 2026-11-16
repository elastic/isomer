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
  type SlackActionElement,
  type SlackBlock,
  type SlackButtonElement,
  type SlackContainerBlock,
  type SlackContextBlock,
  type SlackHeaderBlock,
  type SlackImageElement,
  type SlackMrkdwnTextObject,
  type SlackOptionObject,
  type SlackSectionBlock,
} from './blocks';
import { containerWithChildren, isContainer } from './container';
import { fitFields, SLACK_FIELD_LIMITS, withinCharLimit } from './field_limits';
import {
  assertSlackBaseUrl,
  clampMrkdwn,
  escapeMrkdwn,
  formatHeaderText,
  italic,
  type SlackLinkOptions,
} from './format';
import {
  degradeTable,
  fitsTableShape,
  splitRichTextElement,
  tableCharCount,
} from './rich_text';
import { isUnmodeledSlackBlock } from './unmodeled';

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

const fitsImageUrl = (image: { image_url?: string }): boolean =>
  withinCharLimit(image.image_url, SLACK_FIELD_LIMITS.image.chars.image_url);

const fitImageElement = (image: SlackImageElement): SlackImageElement =>
  fitFields(image, SLACK_FIELD_LIMITS.imageElement);

const fitOption = (option: SlackOptionObject): SlackOptionObject =>
  fitFields(option, SLACK_FIELD_LIMITS.option);

const fitControl = (element: SlackActionElement): SlackActionElement => {
  if (element.type === 'button') {
    return fitFields(element, SLACK_FIELD_LIMITS.button);
  }
  const menu = fitMenuFields(element);
  const maxOptions = SLACK_LIMITS[SLACK_FIELD_LIMITS[menu.type].counts.options];
  if (menu.options) {
    menu.options = menu.options.slice(0, maxOptions).map(fitOption);
  }
  if (menu.type === 'static_select' && menu.option_groups) {
    const { optionGroup } = SLACK_FIELD_LIMITS;
    menu.option_groups = menu.option_groups
      .slice(
        0,
        SLACK_LIMITS[SLACK_FIELD_LIMITS.static_select.counts.option_groups]
      )
      .map((group) => {
        const fitted = fitFields(group, optionGroup);
        return {
          ...fitted,
          options: fitted.options
            .slice(0, SLACK_LIMITS[optionGroup.counts.options])
            .map(fitOption),
        };
      });
  }
  // Slack requires an initial option to equal one it emits, so each is
  // replaced by the emitted option of the same value, or dropped.
  const emitted = new Map(
    [
      ...(menu.options ?? []),
      ...((menu.type === 'static_select' && menu.option_groups) || []).flatMap(
        ({ options }) => options
      ),
    ].map((option) => [option.value, option])
  );
  if ('initial_option' in menu && menu.initial_option) {
    const match = emitted.get(fitOption(menu.initial_option).value);
    if (match) {
      menu.initial_option = match;
    } else {
      delete menu.initial_option;
    }
  }
  if ('initial_options' in menu && menu.initial_options) {
    const matches = menu.initial_options.flatMap((option) => {
      const match = emitted.get(fitOption(option).value);
      return match ? [match] : [];
    });
    if (matches.length > 0) {
      menu.initial_options = matches;
    } else {
      delete menu.initial_options;
    }
  }
  return menu;
};

const fitMenuFields = (
  menu: Exclude<SlackActionElement, SlackButtonElement>
): Exclude<SlackActionElement, SlackButtonElement> => {
  switch (menu.type) {
    case 'overflow':
      return fitFields(menu, SLACK_FIELD_LIMITS.overflow);
    case 'radio_buttons':
      return fitFields(menu, SLACK_FIELD_LIMITS.radio_buttons);
    case 'checkboxes':
      return fitFields(menu, SLACK_FIELD_LIMITS.checkboxes);
    case 'static_select':
      return fitFields(menu, SLACK_FIELD_LIMITS.static_select);
    case 'multi_static_select':
      return fitFields(menu, SLACK_FIELD_LIMITS.multi_static_select);
  }
};

const FIELDS_PER_SECTION =
  SLACK_LIMITS[SLACK_FIELD_LIMITS.section.counts.fields];

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );

// Splits a block past a count limit into blocks of its type. Only the first
// keeps a `block_id`, which Slack requires to be unique.
const splitBlockCounts = (block: SlackBlock): SlackBlock[] => {
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
      return chunks(
        block.elements,
        SLACK_LIMITS[SLACK_FIELD_LIMITS.context.counts.elements]
      ).map((elements, index) =>
        index === 0 ? { ...block, elements } : { type: 'context', elements }
      );
    case 'actions':
      return chunks(
        block.elements,
        SLACK_LIMITS[SLACK_FIELD_LIMITS.actions.counts.elements]
      ).map((elements, index) =>
        index === 0 ? { ...block, elements } : { type: 'actions', elements }
      );
    case 'section': {
      if (!block.fields || block.fields.length <= FIELDS_PER_SECTION) {
        return [block];
      }
      return chunks(block.fields, FIELDS_PER_SECTION).map((fields, index) =>
        index === 0 ? { ...block, fields } : { type: 'section', fields }
      );
    }
    default:
      return [block];
  }
};

// An image whose URL Slack would reject leaves its alt text.
const fitImageUrls = (block: SlackBlock): SlackBlock[] => {
  switch (block.type) {
    case 'image':
      return fitsImageUrl(block)
        ? [block]
        : block.alt_text
          ? [contextBlock([escapeMrkdwn(block.alt_text)])]
          : [];
    case 'context':
      return [
        {
          ...block,
          elements: block.elements.flatMap((element) =>
            element.type !== 'image' || fitsImageUrl(element)
              ? [element]
              : element.alt_text
                ? [{ type: 'mrkdwn', text: escapeMrkdwn(element.alt_text) }]
                : []
          ),
        },
      ];
    case 'section': {
      if (block.accessory?.type !== 'image' || fitsImageUrl(block.accessory)) {
        return [block];
      }
      const { accessory, ...rest } = block;
      return accessory.alt_text
        ? [rest, contextBlock([escapeMrkdwn(accessory.alt_text)])]
        : [rest];
    }
    default:
      return [block];
  }
};

const fitBlock = (block: SlackBlock): SlackBlock[] => {
  if (isUnmodeledSlackBlock(block)) {
    return [block];
  }
  return block.type === 'container'
    ? fitContainer(block)
    : fitImageUrls(block).map(fitBlockText);
};

const fitContainer = (container: SlackContainerBlock): SlackBlock[] => {
  const { rich_text_title, icon, child_blocks } = container;
  const fitted: SlackContainerBlock = {
    ...fitFields(container, SLACK_FIELD_LIMITS.container),
    ...(rich_text_title && {
      rich_text_title: {
        ...rich_text_title,
        elements: rich_text_title.elements.flatMap(splitRichTextElement),
      },
    }),
  };
  if (icon && fitsImageUrl(icon)) {
    fitted.icon = fitImageElement(icon);
  } else {
    delete fitted.icon;
  }
  return containerWithChildren(fitted, child_blocks.flatMap(fitBlock));
};

// Pack renderers build their own blocks, and one overlong text makes Slack
// reject the whole message.
const fitBlockText = (block: SlackBlock): SlackBlock => {
  switch (block.type) {
    case 'header':
      return fitFields(block, SLACK_FIELD_LIMITS.header);
    case 'section':
      return {
        ...fitFields(block, SLACK_FIELD_LIMITS.section),
        ...(block.accessory && {
          accessory:
            block.accessory.type === 'image'
              ? fitImageElement(block.accessory)
              : fitControl(block.accessory),
        }),
      };
    case 'rich_text':
      return {
        ...block,
        elements: block.elements.flatMap(splitRichTextElement),
      };
    case 'context':
      return fitFields(
        {
          ...block,
          elements: block.elements.map((element) =>
            element.type === 'image' ? fitImageElement(element) : element
          ),
        },
        SLACK_FIELD_LIMITS.context
      );
    case 'image':
      return fitFields(block, SLACK_FIELD_LIMITS.image);
    case 'video':
      return fitFields(block, SLACK_FIELD_LIMITS.video);
    case 'actions':
      return { ...block, elements: block.elements.map(fitControl) };
    default:
      return block;
  }
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

const contextBlock = (lines: ReadonlyArray<string>): SlackContextBlock => ({
  type: 'context',
  elements: lines
    .filter((line): line is string => line !== undefined && line.length > 0)
    .map((text) => ({
      type: 'mrkdwn',
      text: clampMrkdwn(text, SLACK_LIMITS.contextElementChars),
    })),
});

const SLACK_SPACER_TEXT = ' ';

const slackSpacerBlock = (): SlackSectionBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text: SLACK_SPACER_TEXT },
});

const isSpacer = (block: SlackBlock): boolean =>
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
          fields.length >= FIELDS_PER_SECTION
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

// Slack counts table cell characters across the whole message, not per block,
// so a composition whose tables individually fit can still be rejected. In
// document order, a table is kept if its shape fits and its cells fit what the
// kept ones left.
const enforceTableLimits = (blocks: readonly SlackBlock[]): SlackBlock[] => {
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
