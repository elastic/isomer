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
  SlackSectionAccessory,
} from './blocks';
import { SLACK_LIMITS } from './blocks';
import {
  fieldLimitProblems,
  overCharLimit,
  overCount,
  RICH_TEXT_ELEMENT_LIMIT,
  SLACK_FIELD_LIMITS,
} from './field_limits';
import { richTextElementText, tableCharCount } from './rich_text';
import { isModeledSlackBlockType, isUnmodeledSlackBlock } from './unmodeled';

const list = <T>(value: readonly T[] | undefined): readonly T[] => value ?? [];

const empty = (where: string, count: number): string[] =>
  count === 0 ? [`${where} is empty; Slack requires at least 1.`] : [];

const {
  actions,
  container,
  context,
  header,
  image,
  imageElement,
  option,
  optionGroup,
  section,
  table,
  video,
} = SLACK_FIELD_LIMITS;

const optionsProblems = (
  where: string,
  options: readonly SlackOptionObject[] | undefined
): string[] =>
  list(options).flatMap((entry, index) =>
    fieldLimitProblems(`${where} options[${index}]`, entry, option)
  );

const controlProblems = (
  where: string,
  element: SlackActionElement
): string[] => {
  switch (element.type) {
    case 'button':
      return fieldLimitProblems(where, element, SLACK_FIELD_LIMITS.button);
    case 'overflow':
      return [
        ...fieldLimitProblems(where, element, SLACK_FIELD_LIMITS.overflow),
        ...optionsProblems(where, element.options),
      ];
    case 'radio_buttons':
      return [
        ...fieldLimitProblems(where, element, SLACK_FIELD_LIMITS.radio_buttons),
        ...optionsProblems(where, element.options),
      ];
    case 'checkboxes':
      return [
        ...fieldLimitProblems(where, element, SLACK_FIELD_LIMITS.checkboxes),
        ...optionsProblems(where, element.options),
      ];
    case 'static_select':
      return [
        ...fieldLimitProblems(where, element, SLACK_FIELD_LIMITS.static_select),
        ...optionsProblems(where, element.options),
        ...list(element.option_groups).flatMap((group, index) => {
          const groupWhere = `${where} option_groups[${index}]`;
          return [
            ...fieldLimitProblems(groupWhere, group, optionGroup),
            ...optionsProblems(groupWhere, group.options),
          ];
        }),
      ];
    case 'multi_static_select':
      return [
        ...fieldLimitProblems(
          where,
          element,
          SLACK_FIELD_LIMITS.multi_static_select
        ),
        ...optionsProblems(where, element.options),
      ];
    default:
      return [];
  }
};

const accessoryProblems = (
  where: string,
  accessory: SlackSectionAccessory
): string[] =>
  accessory.type === 'image'
    ? fieldLimitProblems(where, accessory, imageElement)
    : controlProblems(where, accessory);

const richTextProblems = (
  where: string,
  element: SlackRichTextBlockElement,
  topLevel: boolean
): string[] => {
  if (element.type === 'rich_text_list') {
    return overCount(
      `${where} indent`,
      element.indent ?? 0,
      SLACK_LIMITS.richTextListMaxIndent
    );
  }
  return topLevel
    ? overCharLimit(
        `${where} text`,
        richTextElementText(element),
        SLACK_LIMITS[RICH_TEXT_ELEMENT_LIMIT]
      )
    : [];
};

/** Only a top-level element has a text limit; list items and table cells count toward the message's budgets alone. */
const richTextBlockProblems = (
  where: string,
  { elements }: SlackRichTextBlock,
  topLevel: boolean
): string[] =>
  list(elements).flatMap((element, elementIndex) =>
    richTextProblems(`${where} elements[${elementIndex}]`, element, topLevel)
  );

interface LocatedBlock {
  where: string;
  block: SlackBlock;
}

/** Every block in the message, a container's children after it, each with the path a problem names. */
const located = (blocks: readonly SlackBlock[]): LocatedBlock[] =>
  blocks.flatMap((block, index) => {
    const where = `blocks[${index}] (${block.type})`;
    return [
      { where, block },
      ...(block.type === 'container'
        ? list(block.child_blocks).map((child, childIndex) => ({
            where: `${where} child_blocks[${childIndex}] (${child.type})`,
            block: child,
          }))
        : []),
    ];
  });

const blockProblems = ({ where, block }: LocatedBlock): string[] => {
  switch (block.type) {
    case 'container': {
      const children = list(block.child_blocks);
      return [
        ...fieldLimitProblems(where, block, container),
        ...(block.icon
          ? fieldLimitProblems(`${where} icon`, block.icon, imageElement)
          : []),
        ...(block.rich_text_title
          ? richTextBlockProblems(
              `${where} rich_text_title`,
              block.rich_text_title,
              true
            )
          : []),
        ...empty(`${where} child_blocks`, children.length),
        ...children.flatMap(({ type }, childIndex) =>
          (type as string) === 'container'
            ? [
                `${where} child_blocks[${childIndex}] is a container; Slack does not accept one inside another.`,
              ]
            : []
        ),
      ];
    }
    case 'header':
      return fieldLimitProblems(where, block, header);
    case 'section':
      return [
        ...fieldLimitProblems(where, block, section),
        ...(block.accessory
          ? accessoryProblems(`${where} accessory`, block.accessory)
          : []),
      ];
    case 'context':
      return [
        ...fieldLimitProblems(where, block, context),
        ...list(block.elements).flatMap((element, elementIndex) =>
          element.type === 'image'
            ? fieldLimitProblems(
                `${where} elements[${elementIndex}]`,
                element,
                imageElement
              )
            : []
        ),
      ];
    case 'actions':
      return [
        ...fieldLimitProblems(where, block, actions),
        ...list(block.elements).flatMap((element, elementIndex) =>
          controlProblems(`${where} elements[${elementIndex}]`, element)
        ),
      ];
    case 'image':
      return fieldLimitProblems(where, block, image);
    case 'video':
      return fieldLimitProblems(where, block, video);
    case 'rich_text':
      return richTextBlockProblems(where, block, true);
    case 'table': {
      const rows = list(block.rows);
      return [
        ...fieldLimitProblems(where, block, table),
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
                  cell,
                  false
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
      block.type === 'table' ? total + tableCharCount(block) : total,
    0
  );

const staleWrapperProblems = ({ where, block }: LocatedBlock): string[] => {
  const { type } = block;
  return isUnmodeledSlackBlock(block) && isModeledSlackBlockType(type)
    ? [
        `${where} is wrapped in \`unmodeledSlackBlock\`, but Isomer models \`${type}\` blocks: return it unwrapped so its limits are fitted.`,
      ]
    : [];
};

/** Each block type in `blocks`, a container's children included, that Isomer does not model, once: {@link slackLimitProblems} cannot check those blocks. */
export const unmodeledSlackBlockTypes = (
  blocks: readonly SlackBlock[]
): string[] => [
  ...new Set(
    located(blocks)
      .map(({ block: { type } }): string => type)
      .filter((type) => !isModeledSlackBlockType(type))
  ),
];

/** Where a Slack message breaks `SLACK_LIMITS`, one message per problem; empty when Slack would accept it. */
export const slackLimitProblems = ({
  text,
  blocks,
}: {
  text: string;
  blocks: readonly SlackBlock[];
}): string[] => {
  const all = located(blocks);
  return [
    ...overCount(
      'The message blocks',
      blocks.length,
      SLACK_LIMITS.blocksPerMessage
    ),
    ...overCharLimit('The fallback text', text, SLACK_LIMITS.fallbackTextChars),
    ...overTableText(tableTextLength(all.map(({ block }) => block))),
    ...all.flatMap(blockProblems),
    ...all.flatMap(staleWrapperProblems),
  ];
};
