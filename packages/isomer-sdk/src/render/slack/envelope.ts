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
  type SlackContextBlock,
  type SlackHeaderBlock,
  type SlackMrkdwnTextObject,
  type SlackOptionObject,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
  type SlackRichTextSection,
  type SlackRichTextText,
  type SlackSectionBlock,
  type SlackTableBlock,
  type SlackTableCell,
  type SlackTextObject,
} from './blocks';
import {
  clampMrkdwn,
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
  /** Renders the composition's title and subtitle, in the blocks and the fallback `text`. Defaults to `true`. Pass `false` when the host already shows the title, or the body opens with its own. */
  heading?: boolean;
  /** Fallback `text` summary shown in notifications and previews, as `mrkdwn`; defaults to the text render, escaped. */
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
 * fitted to Slack's limits — text is clamped, blocks past a count limit and
 * `rich_text` elements past a section's limit split, tables past a table limit
 * or the message's cell budget become rich text, spacers and then whole blocks
 * are dropped — so the output is always postable. `assets` stays empty
 * unless `collectAssets` is set.
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

  const { heading = true } = options;
  if (heading && composition.title) {
    blocks.push(headerBlock(composition.title, 1));
  }
  if (heading && composition.subtitle) {
    blocks.push(contextBlock([escapeMrkdwn(composition.subtitle)]));
  }
  for (const node of composition.body) {
    blocks.push(...dispatcher.renderSlack(node, collector).flatMap(fitBlock));
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

const clampText = <TText extends SlackTextObject>(
  text: TText,
  max: number
): TText =>
  text.text.length <= max
    ? text
    : {
        ...text,
        text: (text.type === 'mrkdwn' ? clampMrkdwn : clampSlackText)(
          text.text,
          max
        ),
      };

const fitsImageUrl = ({ image_url }: { image_url?: string }): boolean =>
  image_url === undefined || image_url.length <= SLACK_LIMITS.imageUrlChars;

const clampAlt = <TImage extends { alt_text: string }>(
  image: TImage
): TImage =>
  image.alt_text.length <= SLACK_LIMITS.imageAltTextChars
    ? image
    : {
        ...image,
        alt_text: clampSlackText(
          image.alt_text,
          SLACK_LIMITS.imageAltTextChars
        ),
      };

const clampOption = (option: SlackOptionObject): SlackOptionObject => ({
  ...option,
  text: clampText(option.text, SLACK_LIMITS.optionTextChars),
  ...(option.description && {
    description: clampText(option.description, SLACK_LIMITS.optionTextChars),
  }),
});

// `initial_option(s)` go through the same `clampOption` as `options`, since
// Slack rejects an initial option that matches none of them.
const clampControl = (element: SlackActionElement): SlackActionElement => {
  if (element.type === 'button') {
    return {
      ...element,
      text: clampText(element.text, SLACK_LIMITS.buttonTextChars),
    };
  }
  const menu = { ...element };
  const maxOptions =
    menu.type === 'overflow'
      ? SLACK_LIMITS.optionsPerOverflow
      : menu.type === 'radio_buttons' || menu.type === 'checkboxes'
        ? SLACK_LIMITS.optionsPerChoice
        : SLACK_LIMITS.optionsPerSelect;
  if (menu.options) {
    menu.options = menu.options.slice(0, maxOptions).map(clampOption);
  }
  if ('placeholder' in menu && menu.placeholder) {
    menu.placeholder = clampText(
      menu.placeholder,
      SLACK_LIMITS.placeholderChars
    );
  }
  if ('option_groups' in menu && menu.option_groups) {
    menu.option_groups = menu.option_groups
      .slice(0, SLACK_LIMITS.optionGroupsPerSelect)
      .map((group) => ({
        ...group,
        label: clampText(group.label, SLACK_LIMITS.optionGroupLabelChars),
        options: group.options.slice(0, maxOptions).map(clampOption),
      }));
  }
  // Slack requires an initial option to equal one it emits, so each is
  // replaced by the emitted option of the same value, or dropped.
  const emitted = new Map(
    [
      ...(menu.options ?? []),
      ...(('option_groups' in menu && menu.option_groups) || []).flatMap(
        ({ options }) => options
      ),
    ].map((option) => [option.value, option])
  );
  if ('initial_option' in menu && menu.initial_option) {
    const match = emitted.get(menu.initial_option.value);
    if (match) {
      menu.initial_option = match;
    } else {
      delete menu.initial_option;
    }
  }
  if ('initial_options' in menu && menu.initial_options) {
    menu.initial_options = menu.initial_options.flatMap(({ value }) => {
      const match = emitted.get(value);
      return match ? [match] : [];
    });
  }
  return menu;
};

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size)
  );

// Splits a block past a count limit into blocks of its type. Only the first
// keeps a `block_id`, which Slack requires to be unique.
const splitBlockCounts = (block: SlackBlock): SlackBlock[] => {
  switch (block.type) {
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
          elements: block.elements.map((element) =>
            element.type !== 'image' || fitsImageUrl(element)
              ? element
              : { type: 'mrkdwn', text: escapeMrkdwn(element.alt_text) }
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

const fitBlock = (block: SlackBlock): SlackBlock[] =>
  fitImageUrls(block).map(clampBlockText);

// Pack renderers build their own blocks, and one overlong text makes Slack
// reject the whole message.
const clampBlockText = (block: SlackBlock): SlackBlock => {
  switch (block.type) {
    case 'header':
      return {
        ...block,
        text: clampText(block.text, SLACK_LIMITS.headerTextChars),
      };
    case 'section':
      return {
        ...block,
        ...(block.text && {
          text: clampText(block.text, SLACK_LIMITS.sectionTextChars),
        }),
        ...(block.fields && {
          fields: block.fields.map((field) =>
            clampText(field, SLACK_LIMITS.sectionFieldChars)
          ),
        }),
        ...(block.accessory && {
          accessory:
            block.accessory.type === 'image'
              ? clampAlt(block.accessory)
              : clampControl(block.accessory),
        }),
      };
    case 'rich_text':
      return {
        ...block,
        elements: block.elements.flatMap(splitRichTextElement),
      };
    case 'context':
      return {
        ...block,
        elements: block.elements.map((element) =>
          element.type === 'image'
            ? clampAlt(element)
            : clampText(element, SLACK_LIMITS.contextElementChars)
        ),
      };
    case 'image':
      return {
        ...clampAlt(block),
        ...(block.title && {
          title: clampText(block.title, SLACK_LIMITS.imageTitleChars),
        }),
      };
    case 'video':
      return {
        ...block,
        title: clampText(block.title, SLACK_LIMITS.videoTitleChars),
        ...(block.description && {
          description: clampText(
            block.description,
            SLACK_LIMITS.videoDescriptionChars
          ),
        }),
        ...(block.author_name !== undefined && {
          author_name: clampSlackText(
            block.author_name,
            SLACK_LIMITS.videoAuthorNameChars
          ),
        }),
      };
    case 'actions':
      return { ...block, elements: block.elements.map(clampControl) };
    default:
      return block;
  }
};

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
      text: clampMrkdwn(text, SLACK_LIMITS.contextElementChars),
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

const textRun = (text: string): SlackRichTextText => ({ type: 'text', text });

const richSection = (
  elements: SlackRichTextInline[]
): SlackRichTextSection => ({ type: 'rich_text_section', elements });

const rowBreak = (): SlackRichTextSection => richSection([textRun('\n')]);

const cellElements = (
  cell: SlackTableCell | undefined
): SlackRichTextBlockElement[] => {
  if (cell?.type === 'rich_text') {
    return cell.elements.filter(({ elements }) => elements.length > 0);
  }
  return cell?.text ? [richSection([textRun(cell.text)])] : [];
};

const boldInline = (inline: SlackRichTextInline): SlackRichTextInline => ({
  ...inline,
  style: { ...inline.style, bold: true },
});

const boldElement = (
  element: SlackRichTextBlockElement
): SlackRichTextBlockElement =>
  element.type === 'rich_text_list'
    ? {
        ...element,
        elements: element.elements.map((item) => ({
          ...item,
          elements: item.elements.map(boldInline),
        })),
      }
    : { ...element, elements: element.elements.map(boldInline) };

const isBlank = (cell: SlackTableCell | undefined): boolean =>
  cell === undefined || tableCellText(cell).trim() === '';

// A one-section heading leads its cell as `heading: `; any other heading keeps
// its blocks, bold, above the cell. A blank heading leaves the cell alone.
const columnElements = (
  heading: SlackTableCell | undefined,
  cell: SlackTableCell | undefined
): SlackRichTextBlockElement[] => {
  const body = cellElements(cell);
  if (isBlank(heading)) {
    return body;
  }
  const head = cellElements(heading);
  const [only] = head;
  if (head.length !== 1 || only?.type !== 'rich_text_section') {
    return [...head.map(boldElement), ...body];
  }
  const lead = [...only.elements.map(boldInline), textRun(': ')];
  const [first, ...rest] = body;
  return first?.type === 'rich_text_section'
    ? [richSection([...lead, ...first.elements]), ...rest]
    : [richSection(lead), ...body];
};

const endsLine = (element: SlackRichTextBlockElement): boolean =>
  /[\n\r\u2028\u2029]$/u.test(richTextElementText(element));

// Slack runs adjacent sections together, so a section followed by another ends
// its line unless its rendered text already does.
const breakSections = (
  elements: readonly SlackRichTextBlockElement[]
): SlackRichTextBlockElement[] =>
  elements.map((element, index) =>
    element.type === 'rich_text_section' &&
    elements[index + 1]?.type === 'rich_text_section' &&
    !endsLine(element)
      ? richSection([...element.elements, textRun('\n')])
      : element
  );

// Graphemes, and the code points of any grapheme past `max`.
const textUnits = (text: string, max: number): string[] =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    ({ segment }) => (segment.length > max ? Array.from(segment) : [segment])
  ).flat();

/**
 * A section, quote, or preformatted element past `sectionTextChars` as adjacent ones of its type, with nothing added between them; a list comes back as is.
 * A link or tag no longer than that stays whole; anything longer splits at grapheme boundaries into inlines of its own type, a link's label (or URL) across links to the same URL.
 */
const splitRichTextElement = (
  element: SlackRichTextBlockElement
): SlackRichTextBlockElement[] => {
  const max = SLACK_LIMITS.sectionTextChars;
  if (
    element.type === 'rich_text_list' ||
    richTextElementText(element).length <= max
  ) {
    return [element];
  }
  const chunks: SlackRichTextInline[][] = [];
  let chunk: SlackRichTextInline[] = [];
  let room: number = max;
  const flush = (): void => {
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    chunk = [];
    room = max;
  };
  for (const inline of element.elements) {
    const whole = richTextInlineText(inline);
    if (inline.type !== 'text' && whole.length <= max) {
      if (whole.length > room) {
        flush();
      }
      chunk.push(inline);
      room -= whole.length;
      continue;
    }
    let text = '';
    for (const unit of textUnits(whole, max)) {
      if (text.length + unit.length > room) {
        if (text) {
          chunk.push({ ...inline, text });
        }
        flush();
        text = '';
      }
      text += unit;
    }
    if (text) {
      chunk.push({ ...inline, text });
      room -= text.length;
    }
  }
  flush();
  return chunks.map((elements) => ({ ...element, elements }));
};

// A table Slack would reject is replaced by one `rich_text` block. Each row's
// columns run `heading: cell` to the wider of the header and the row, and a
// blank section parts the rows. A cell keeps its inlines, styles, and blocks; a
// table whose rows past the header have no cells prints its headings, and one
// with nothing to print is dropped.
const degradeTable = ({
  rows: [header = [], ...body],
}: SlackTableBlock): SlackBlock[] => {
  const rows = body.filter((row) => row.length > 0);
  const pieces =
    rows.length === 0
      ? [
          header
            .filter((heading) => !isBlank(heading))
            .flatMap((heading) => cellElements(heading).map(boldElement)),
        ]
      : rows.map((row) =>
          Array.from(
            { length: Math.max(header.length, row.length) },
            (_, column) => columnElements(header[column], row[column])
          ).flat()
        );
  const elements = pieces
    .filter((piece) => piece.length > 0)
    .flatMap((piece, index) => (index > 0 ? [rowBreak(), ...piece] : piece));
  return elements.length === 0
    ? []
    : [
        {
          type: 'rich_text',
          elements: breakSections(elements).flatMap(splitRichTextElement),
        },
      ];
};

const fitsTableShape = ({ rows }: SlackTableBlock): boolean =>
  rows.length > 0 &&
  rows.length <= SLACK_LIMITS.tableRows &&
  rows.every(
    (row) => row.length > 0 && row.length <= SLACK_LIMITS.tableColumns
  );

// Slack counts table cell characters across the whole message, not per block,
// so a composition whose tables individually fit can still be rejected. In
// document order, a table is kept if its shape fits and its cells fit what the
// kept ones left.
const enforceTableLimits = (blocks: readonly SlackBlock[]): SlackBlock[] => {
  let spent = 0;
  return blocks.flatMap((block) => {
    if (block.type !== 'table') {
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
  });
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
