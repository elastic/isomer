/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The `text` of a text object, or of an element that carries one. */
const textOf = (value: unknown): string | undefined => {
  if (!isFields(value)) {
    return undefined;
  }
  const { text } = value;
  if (typeof text === 'string') {
    return text;
  }
  return isFields(text) && typeof text.text === 'string'
    ? text.text
    : undefined;
};

const overLength = (
  where: string,
  text: string | undefined,
  limit: number
): string[] =>
  text !== undefined && text.length > limit
    ? [`${where} has ${text.length} characters; Slack allows ${limit}.`]
    : [];

const overCount = (where: string, count: number, limit: number): string[] =>
  count > limit ? [`${where} has ${count}; Slack allows ${limit}.`] : [];

const blockProblems = (block: SlackBlock, index: number): string[] => {
  const fields: Fields = { ...block };
  const where = `blocks[${index}] (${block.type})`;
  switch (block.type) {
    case 'header':
      return overLength(
        `${where} text`,
        textOf(fields),
        SLACK_LIMITS.headerTextChars
      );
    case 'section': {
      const sectionFields = list(fields.fields);
      return [
        ...overLength(
          `${where} text`,
          textOf(fields),
          SLACK_LIMITS.sectionTextChars
        ),
        ...overCount(
          `${where} fields`,
          sectionFields.length,
          SLACK_LIMITS.fieldsPerSection
        ),
        ...sectionFields.flatMap((field, fieldIndex) =>
          overLength(
            `${where} fields[${fieldIndex}]`,
            textOf({ text: field }),
            SLACK_LIMITS.sectionFieldChars
          )
        ),
      ];
    }
    case 'context': {
      const elements = list(fields.elements);
      return [
        ...overCount(
          `${where} elements`,
          elements.length,
          SLACK_LIMITS.contextElements
        ),
        ...elements.flatMap((element, elementIndex) =>
          overLength(
            `${where} elements[${elementIndex}]`,
            textOf({ text: element }),
            SLACK_LIMITS.contextElementChars
          )
        ),
      ];
    }
    case 'actions':
      return overCount(
        `${where} elements`,
        list(fields.elements).length,
        SLACK_LIMITS.buttonsPerActions
      );
    case 'table': {
      const rows = list(fields.rows);
      return [
        ...overCount(`${where} rows`, rows.length, SLACK_LIMITS.tableRows),
        ...rows.flatMap((row, rowIndex) =>
          overCount(
            `${where} rows[${rowIndex}] cells`,
            list(row).length,
            SLACK_LIMITS.tableColumns
          )
        ),
      ];
    }
    default:
      return [];
  }
};

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
  ...blocks.flatMap(blockProblems),
];
