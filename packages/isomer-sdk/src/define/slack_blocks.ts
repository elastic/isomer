/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Slack surface output types for SurfaceMap. Not wire format.
//
// Message-surface Block Kit only (channel/DM posts). Field names and shapes
// match Slack's JSON so output can go to `chat.postMessage`. Fields are
// commented only where this subset departs from the published contract, or
// where Slack's behavior is not evident from the name.
//
// References:
//   https://api.slack.com/reference/block-kit/blocks
//   https://api.slack.com/reference/block-kit/composition-objects
//   https://api.slack.com/reference/block-kit/block-elements

export interface SlackPlainTextObject {
  type: 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface SlackMrkdwnTextObject {
  type: 'mrkdwn';
  text: string;
  /** When false, Slack does not auto-link channels/users. Defaults to true. */
  verbatim?: boolean;
}

export type SlackTextObject = SlackPlainTextObject | SlackMrkdwnTextObject;

export type SlackHeaderLevel = 1 | 2 | 3 | 4;

export interface SlackHeaderBlock {
  type: 'header';
  block_id?: string;
  text: SlackPlainTextObject;
  /** H1–H4 sizing. Accepted on message, modal, and Home tab surfaces. */
  level?: SlackHeaderLevel;
}

export interface SlackSectionBlock {
  type: 'section';
  block_id?: string;
  text?: SlackTextObject;
  fields?: SlackMrkdwnTextObject[];
  accessory?: SlackSectionAccessory;
}

export interface SlackDividerBlock {
  type: 'divider';
  block_id?: string;
}

/**
 * Inline image used inside `context` blocks and as a `section` accessory.
 * Distinct from the block-level {@link SlackImageBlock}.
 */
export interface SlackImageElement {
  type: 'image';
  image_url: string;
  alt_text: string;
}

export interface SlackContextBlock {
  type: 'context';
  block_id?: string;
  elements: Array<SlackTextObject | SlackImageElement>;
}

export interface SlackButtonElement {
  type: 'button';
  text: SlackPlainTextObject;
  url?: string;
  value?: string;
  action_id?: string;
  style?: 'primary' | 'danger';
}

/**
 * Reference to a file already uploaded to Slack.
 *
 * `id` and `url` are Slack's published fields. `ref` is not: a render cannot
 * upload, so it emits a placeholder the host swaps for Slack's file id once
 * the upload lands. See `SlackAssetCollector`.
 */
export interface SlackFileReference {
  id?: string;
  url?: string;
  ref?: string;
}

/**
 * Block-level image. `image_url` requires a publicly hosted URL; `slack_file`
 * references a file uploaded to Slack first, which is the only VPN-safe path.
 */
export interface SlackImageBlock {
  type: 'image';
  block_id?: string;
  alt_text: string;
  image_url?: string;
  slack_file?: SlackFileReference;
  title?: SlackPlainTextObject;
}

/** `video` block, matching Slack's JSON contract exactly. */
export interface SlackVideoBlock {
  type: 'video';
  block_id?: string;
  title: SlackPlainTextObject;
  title_url?: string;
  video_url: string;
  thumbnail_url: string;
  alt_text: string;
  description?: SlackPlainTextObject;
  author_name?: string;
  provider_name?: string;
  provider_icon_url?: string;
}

export interface SlackRichTextStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

export interface SlackRichTextText {
  type: 'text';
  text: string;
  style?: SlackRichTextStyle;
}

export interface SlackRichTextLink {
  type: 'link';
  url: string;
  text?: string;
  style?: SlackRichTextStyle;
}

export type SlackTagColor =
  | 'gray'
  | 'brown'
  | 'purple'
  | 'indigo'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red';

export interface SlackRichTextTag {
  type: 'tag';
  text: string;
  color?: SlackTagColor;
  style?: SlackRichTextStyle;
}

export type SlackRichTextInline =
  SlackRichTextText | SlackRichTextLink | SlackRichTextTag;

export interface SlackRichTextSection {
  type: 'rich_text_section';
  elements: SlackRichTextInline[];
}

export interface SlackRichTextList {
  type: 'rich_text_list';
  style: 'bullet' | 'ordered';
  indent?: number;
  border?: number;
  elements: SlackRichTextSection[];
}

export interface SlackRichTextPreformatted {
  type: 'rich_text_preformatted';
  border?: number;
  elements: SlackRichTextInline[];
}

export interface SlackRichTextQuote {
  type: 'rich_text_quote';
  border?: number;
  elements: SlackRichTextInline[];
}

export type SlackRichTextBlockElement =
  | SlackRichTextSection
  | SlackRichTextList
  | SlackRichTextPreformatted
  | SlackRichTextQuote;

export interface SlackRichTextBlock {
  type: 'rich_text';
  block_id?: string;
  elements: SlackRichTextBlockElement[];
}

/** The option shape shared by every menu, select, checkbox, and radio element. */
export interface SlackOptionObject {
  text: SlackTextObject;
  value: string;
  description?: SlackPlainTextObject;
  /** Only honored inside an `overflow` element. */
  url?: string;
}

export interface SlackOptionGroup {
  label: SlackPlainTextObject;
  options: SlackOptionObject[];
}

export interface SlackOverflowElement {
  type: 'overflow';
  action_id: string;
  options: SlackOptionObject[];
}

export interface SlackStaticSelectElement {
  type: 'static_select';
  action_id: string;
  placeholder?: SlackPlainTextObject;
  options?: SlackOptionObject[];
  option_groups?: SlackOptionGroup[];
  initial_option?: SlackOptionObject;
}

export interface SlackMultiStaticSelectElement {
  type: 'multi_static_select';
  action_id: string;
  placeholder?: SlackPlainTextObject;
  options: SlackOptionObject[];
  initial_options?: SlackOptionObject[];
  max_selected_items?: number;
}

export interface SlackRadioButtonsElement {
  type: 'radio_buttons';
  action_id: string;
  options: SlackOptionObject[];
  initial_option?: SlackOptionObject;
}

export interface SlackCheckboxesElement {
  type: 'checkboxes';
  action_id: string;
  options: SlackOptionObject[];
  initial_options?: SlackOptionObject[];
}

/** Elements Slack permits inside an `actions` block. */
export type SlackActionElement =
  | SlackButtonElement
  | SlackOverflowElement
  | SlackStaticSelectElement
  | SlackMultiStaticSelectElement
  | SlackRadioButtonsElement
  | SlackCheckboxesElement;

/** Elements Slack permits as a `section.accessory`. */
export type SlackSectionAccessory =
  | SlackButtonElement
  | SlackImageElement
  | SlackOverflowElement
  | SlackStaticSelectElement
  | SlackMultiStaticSelectElement
  | SlackRadioButtonsElement
  | SlackCheckboxesElement;

export interface SlackActionsBlock {
  type: 'actions';
  block_id?: string;
  elements: SlackActionElement[];
}

/** A plain table cell. Strings and numbers use this; see {@link SlackTableCell}. */
export interface SlackRawTextElement {
  type: 'raw_text';
  text: string;
}

/**
 * One table cell. Badge and toned values need the `rich_text` form so a `tag`
 * or bold run can sit inside the grid.
 */
export type SlackTableCell = SlackRawTextElement | SlackRichTextBlock;

/**
 * Per-column behavior, positional: entry N configures column N.
 *
 * Trailing columns without an entry keep Slack's defaults (left-aligned, no
 * wrapping), and a `null` entry skips a column.
 */
export interface SlackTableColumnSetting {
  align?: 'left' | 'center' | 'right';
  is_wrapped?: boolean;
}

/**
 * Native `table` block, whose first row renders as the header.
 *
 * Cells, rows, and columns are capped by Slack; see `SLACK_LIMITS`.
 * https://docs.slack.dev/reference/block-kit/blocks/table-block
 */
export interface SlackTableBlock {
  type: 'table';
  block_id?: string;
  rows: SlackTableCell[][];
  column_settings?: Array<SlackTableColumnSetting | null>;
}

/** Every block this renderer emits, and what a `slack` renderer returns. */
export type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackImageBlock
  | SlackVideoBlock
  | SlackContextBlock
  | SlackActionsBlock
  | SlackRichTextBlock
  | SlackTableBlock;
