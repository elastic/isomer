/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import type {
  SlackRichTextText,
  SlackTableBlock,
  SlackTableCell,
} from '@elastic/isomer-sdk/slack';

import { displayColumns } from './mono';

/** Space-padded columns under a dashed rule. */
export const textTable = (
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): string => {
  const head = columns.map(oneLine);
  const body = rows.map((row) => row.map(oneLine));
  const widths = head.map((column, index) =>
    Math.max(
      displayColumns(column),
      ...body.map((row) => displayColumns(row[index] ?? ''))
    )
  );
  const line = (cells: readonly string[]) =>
    cells
      .map(
        (cell, index) =>
          `${cell}${' '.repeat(Math.max(0, (widths[index] ?? 0) - displayColumns(cell)))}`
      )
      .join('  ')
      .trimEnd();
  return [
    line(head),
    line(widths.map((width) => '-'.repeat(width))),
    ...body.map(line),
  ].join('\n');
};

/** `raw_text` when no run is styled, else rich text. */
export const slackTableCell = (
  runs: readonly SlackRichTextText[]
): SlackTableCell =>
  runs.every(({ style }) => style === undefined)
    ? { type: 'raw_text', text: runs.map(({ text }) => text).join('') }
    : {
        type: 'rich_text',
        elements: [{ type: 'rich_text_section', elements: [...runs] }],
      };

/** Each cell as its runs. */
export type SlackTableRow = readonly (readonly SlackRichTextText[])[];

/** A `table` block of wrapped columns; `renderSlackEnvelope` turns one Slack would refuse into rich text. */
export const slackTable = (
  head: SlackTableRow,
  rows: readonly SlackTableRow[]
): SlackTableBlock => ({
  type: 'table',
  rows: [head, ...rows].map((row) => row.map(slackTableCell)),
  column_settings: head.map(() => ({ is_wrapped: true })),
});
