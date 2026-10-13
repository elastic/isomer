/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlackActionElement,
  SlackBlock,
  SlackOptionObject,
  SlackRichTextBlock,
  SlackRichTextBlockElement,
  SlackRichTextInline,
  SlackSectionAccessory,
  SlackTableCell,
} from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

const list = <T>(value: readonly T[] | undefined): readonly T[] => value ?? [];

const overLength = (
  where: string,
  text: string | undefined,
  limit: number
): string[] =>
  typeof text === 'string' && text.length > limit
    ? [`${where} has ${text.length} characters; Slack allows ${limit}.`]
    : [];

const overCount = (where: string, count: number, limit: number): string[] =>
  count > limit ? [`${where} has ${count}; Slack allows ${limit}.`] : [];

const empty = (where: string, count: number): string[] =>
  count === 0 ? [`${where} is empty; Slack requires at least 1.`] : [];

const inlineText = (inline: SlackRichTextInline): string =>
  inline.type === 'link' ? (inline.text ?? inline.url) : inline.text;

const richTextText = (element: SlackRichTextBlockElement): string =>
  element.type === 'rich_text_list'
    ? list(element.elements).map(richTextText).join('')
    : list(element.elements).map(inlineText).join('');

const cellText = (cell: SlackTableCell): string =>
  cell.type === 'raw_text'
    ? cell.text
    : list(cell.elements).map(richTextText).join('');

const imageProblems = (
  where: string,
  { image_url, alt_text }: { image_url?: string; alt_text?: string }
): string[] => [
  ...overLength(`${where} image_url`, image_url, SLACK_LIMITS.imageUrlChars),
  ...overLength(`${where} alt_text`, alt_text, SLACK_LIMITS.imageAltTextChars),
];

const optionProblems = (
  where: string,
  { text, value, description, url }: SlackOptionObject
): string[] => [
  ...overLength(`${where} text`, text?.text, SLACK_LIMITS.optionTextChars),
  ...overLength(`${where} value`, value, SLACK_LIMITS.optionValueChars),
  ...overLength(
    `${where} description`,
    description?.text,
    SLACK_LIMITS.optionTextChars
  ),
  ...overLength(`${where} url`, url, SLACK_LIMITS.urlChars),
];

const optionsProblems = (
  where: string,
  options: readonly SlackOptionObject[] | undefined,
  limit: number
): string[] => [
  ...overCount(`${where} options`, list(options).length, limit),
  ...list(options).flatMap((option, index) =>
    optionProblems(`${where} options[${index}]`, option)
  ),
];

const controlProblems = (
  where: string,
  element: SlackActionElement
): string[] => {
  const actionId = overLength(
    `${where} action_id`,
    element.action_id,
    SLACK_LIMITS.actionIdChars
  );
  switch (element.type) {
    case 'button':
      return [
        ...actionId,
        ...overLength(
          `${where} text`,
          element.text?.text,
          SLACK_LIMITS.buttonTextChars
        ),
        ...overLength(
          `${where} value`,
          element.value,
          SLACK_LIMITS.buttonValueChars
        ),
        ...overLength(`${where} url`, element.url, SLACK_LIMITS.urlChars),
      ];
    case 'overflow':
      return [
        ...actionId,
        ...optionsProblems(
          where,
          element.options,
          SLACK_LIMITS.optionsPerOverflow
        ),
      ];
    case 'radio_buttons':
    case 'checkboxes':
      return [
        ...actionId,
        ...optionsProblems(
          where,
          element.options,
          SLACK_LIMITS.optionsPerChoice
        ),
      ];
    case 'static_select':
    case 'multi_static_select': {
      const groups =
        element.type === 'static_select' ? list(element.option_groups) : [];
      return [
        ...actionId,
        ...overLength(
          `${where} placeholder`,
          element.placeholder?.text,
          SLACK_LIMITS.placeholderChars
        ),
        ...optionsProblems(
          where,
          element.options,
          SLACK_LIMITS.optionsPerSelect
        ),
        ...overCount(
          `${where} option_groups`,
          groups.length,
          SLACK_LIMITS.optionGroupsPerSelect
        ),
        ...groups.flatMap(({ label, options }, index) => [
          ...overLength(
            `${where} option_groups[${index}] label`,
            label?.text,
            SLACK_LIMITS.optionGroupLabelChars
          ),
          ...optionsProblems(
            `${where} option_groups[${index}]`,
            options,
            SLACK_LIMITS.optionsPerSelect
          ),
        ]),
      ];
    }
    default:
      return actionId;
  }
};

const accessoryProblems = (
  where: string,
  accessory: SlackSectionAccessory
): string[] =>
  accessory.type === 'image'
    ? imageProblems(where, accessory)
    : controlProblems(where, accessory);

const richTextProblems = (
  where: string,
  element: SlackRichTextBlockElement
): string[] =>
  element.type === 'rich_text_list'
    ? [
        ...overCount(
          `${where} indent`,
          element.indent ?? 0,
          SLACK_LIMITS.richTextListMaxIndent
        ),
        ...list(element.elements).flatMap((section, sectionIndex) =>
          richTextProblems(`${where} elements[${sectionIndex}]`, section)
        ),
      ]
    : overLength(
        `${where} text`,
        richTextText(element),
        SLACK_LIMITS.sectionTextChars
      );

const richTextBlockProblems = (
  where: string,
  { elements }: SlackRichTextBlock
): string[] =>
  list(elements).flatMap((element, elementIndex) =>
    richTextProblems(`${where} elements[${elementIndex}]`, element)
  );

const blockProblems = (block: SlackBlock, index: number): string[] => {
  const where = `blocks[${index}] (${block.type})`;
  switch (block.type) {
    case 'header':
      return overLength(
        `${where} text`,
        block.text?.text,
        SLACK_LIMITS.headerTextChars
      );
    case 'section': {
      const fields = list(block.fields);
      return [
        ...overLength(
          `${where} text`,
          block.text?.text,
          SLACK_LIMITS.sectionTextChars
        ),
        ...overCount(
          `${where} fields`,
          fields.length,
          SLACK_LIMITS.fieldsPerSection
        ),
        ...fields.flatMap((field, fieldIndex) =>
          overLength(
            `${where} fields[${fieldIndex}]`,
            field?.text,
            SLACK_LIMITS.sectionFieldChars
          )
        ),
        ...(block.accessory
          ? accessoryProblems(`${where} accessory`, block.accessory)
          : []),
      ];
    }
    case 'context': {
      const elements = list(block.elements);
      return [
        ...overCount(
          `${where} elements`,
          elements.length,
          SLACK_LIMITS.contextElements
        ),
        ...elements.flatMap((element, elementIndex) =>
          element.type === 'image'
            ? imageProblems(`${where} elements[${elementIndex}]`, element)
            : overLength(
                `${where} elements[${elementIndex}]`,
                element.text,
                SLACK_LIMITS.contextElementChars
              )
        ),
      ];
    }
    case 'actions': {
      const elements = list(block.elements);
      return [
        ...overCount(
          `${where} elements`,
          elements.length,
          SLACK_LIMITS.buttonsPerActions
        ),
        ...elements.flatMap((element, elementIndex) =>
          controlProblems(`${where} elements[${elementIndex}]`, element)
        ),
      ];
    }
    case 'image':
      return [
        ...imageProblems(where, block),
        ...overLength(
          `${where} title`,
          block.title?.text,
          SLACK_LIMITS.imageTitleChars
        ),
      ];
    case 'video':
      return [
        ...overLength(
          `${where} title`,
          block.title?.text,
          SLACK_LIMITS.videoTitleChars
        ),
        ...overLength(
          `${where} description`,
          block.description?.text,
          SLACK_LIMITS.videoDescriptionChars
        ),
        ...overLength(
          `${where} author_name`,
          block.author_name,
          SLACK_LIMITS.videoAuthorNameChars
        ),
      ];
    case 'rich_text':
      return richTextBlockProblems(where, block);
    case 'table': {
      const rows = list(block.rows);
      return [
        ...overCount(`${where} rows`, rows.length, SLACK_LIMITS.tableRows),
        ...empty(`${where} rows`, rows.length),
        ...rows.flatMap((row, rowIndex) => [
          ...overCount(
            `${where} rows[${rowIndex}] cells`,
            list(row).length,
            SLACK_LIMITS.tableColumns
          ),
          ...empty(`${where} rows[${rowIndex}] cells`, list(row).length),
          ...list(row).flatMap((cell, cellIndex) =>
            cell.type === 'rich_text'
              ? richTextBlockProblems(
                  `${where} rows[${rowIndex}][${cellIndex}]`,
                  cell
                )
              : []
          ),
        ]),
      ];
    }
    default:
      return [];
  }
};

const overTableText = (length: number): string[] =>
  length > SLACK_LIMITS.tableCellCharsPerMessage
    ? [
        `The message's table cells have ${length} characters; Slack allows ${SLACK_LIMITS.tableCellCharsPerMessage}.`,
      ]
    : [];

const tableTextLength = (blocks: readonly SlackBlock[]): number =>
  blocks.reduce(
    (total, block) =>
      block.type === 'table'
        ? list(block.rows).reduce(
            (sum, row) =>
              list(row).reduce(
                (cells, cell) => cells + cellText(cell).length,
                sum
              ),
            total
          )
        : total,
    0
  );

/** Where a rendered Slack message breaks `SLACK_LIMITS`; empty when Slack would accept it. */
export const slackLimitProblems = ({
  text,
  blocks,
}: {
  text: string;
  blocks: readonly SlackBlock[];
}): string[] => [
  ...overCount(
    'The message blocks',
    blocks.length,
    SLACK_LIMITS.blocksPerMessage
  ),
  ...overLength('The fallback text', text, SLACK_LIMITS.fallbackTextChars),
  ...overTableText(tableTextLength(blocks)),
  ...blocks.flatMap(blockProblems),
];
