/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  SlackActionElement,
  SlackActionsBlock,
  SlackBlock,
  SlackButtonElement,
  SlackCheckboxesElement,
  SlackContextBlock,
  SlackDividerBlock,
  SlackFileReference,
  SlackHeaderBlock,
  SlackHeaderLevel,
  SlackImageBlock,
  SlackImageElement,
  SlackMrkdwnTextObject,
  SlackMultiStaticSelectElement,
  SlackOptionGroup,
  SlackOptionObject,
  SlackOverflowElement,
  SlackPlainTextObject,
  SlackRadioButtonsElement,
  SlackRawTextElement,
  SlackRichTextBlock,
  SlackRichTextBlockElement,
  SlackRichTextInline,
  SlackRichTextLink,
  SlackRichTextList,
  SlackRichTextPreformatted,
  SlackRichTextQuote,
  SlackRichTextSection,
  SlackRichTextStyle,
  SlackRichTextTag,
  SlackRichTextText,
  SlackSectionAccessory,
  SlackSectionBlock,
  SlackStaticSelectElement,
  SlackTableBlock,
  SlackTableCell,
  SlackTableColumnSetting,
  SlackTagColor,
  SlackTextObject,
  SlackVideoBlock,
} from '../../define/slack_blocks';

/**
 * Slack's published surface limits, enforced by the renderer so a composition
 * cannot silently trip Slack's validation.
 */
export const SLACK_LIMITS = {
  blocksPerMessage: 50,
  /** `section.text`. */
  sectionTextChars: 3000,
  /** One entry of `section.fields`. */
  sectionFieldChars: 2000,
  /** One entry of `context.elements`. */
  contextElementChars: 2000,
  /** `header.text`, which is `plain_text`. */
  headerTextChars: 150,
  fieldsPerSection: 10,
  /** Elements per `context` block. */
  contextElements: 10,
  buttonsPerActions: 25,
  /** Slack truncates the top-level `text` fallback in notifications around here. */
  fallbackTextChars: 4000,
  /** `plain_text` option labels (selects, radio, checkboxes, overflow). */
  optionTextChars: 75,
  /** Options per select, or per option group of one. */
  optionsPerSelect: 100,
  /** Options per overflow menu (Slack caps overflow at 5). */
  optionsPerOverflow: 5,
  /** Options per radio button group or checkboxes element. */
  optionsPerChoice: 10,
  /** Option groups per select, each holding up to `optionsPerSelect` options. */
  optionGroupsPerSelect: 100,
  /** An option's `value`, which interactions send back. */
  optionValueChars: 150,
  /** A button's `value`. */
  buttonValueChars: 2000,
  /** A button's or overflow option's `url`. */
  urlChars: 3000,
  /** An interactive element's `action_id`. */
  actionIdChars: 255,
  /** Max indent level for `rich_text_list`. */
  richTextListMaxIndent: 8,
  /**
   * Characters across every table cell in one message. Slack publishes the
   * same 10,000 figure per table and per message, so the message-wide
   * aggregate is the binding one.
   * https://docs.slack.dev/reference/block-kit/blocks/table-block/
   */
  tableCellCharsPerMessage: 10_000,
  /** Rows per `table` block (includes the header row). */
  tableRows: 100,
  /** Cells per `table` row / columns per table. */
  tableColumns: 20,
  /** `image`/image-element `image_url` max length. */
  imageUrlChars: 3000,
  /** `image`/image-element `alt_text` max length. */
  imageAltTextChars: 2000,
  /** `image` block `title`. */
  imageTitleChars: 2000,
  /** `video` block `title`; Slack requires fewer than 200. */
  videoTitleChars: 199,
  /** `video` block `description`; Slack requires fewer than 200. */
  videoDescriptionChars: 199,
  /** `video` block `author_name`; Slack requires fewer than 50. */
  videoAuthorNameChars: 49,
  /** `button` element `text`. */
  buttonTextChars: 75,
  /** Select `placeholder`. */
  placeholderChars: 150,
  /** `option_groups[].label`. */
  optionGroupLabelChars: 75,
} as const;
