/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SlackBlock,
  SlackRichTextText,
  SlackTableCell,
} from '@elastic/isomer-sdk/slack';

import { richTextRun } from './marks';
import { displayColumns } from './mono';
import { oneLine } from './one_line';

/** A row of cells, or a heading on its own line. */
export type TextTableLine = readonly string[] | string;

/** Space-padded columns under a dashed rule. */
export const textTable = (
  columns: readonly string[],
  lines: readonly TextTableLine[]
): string => {
  const head = columns.map(oneLine);
  const body = lines.map((line) =>
    typeof line === 'string' ? oneLine(line) : line.map(oneLine)
  );
  const rows = body.filter((line) => typeof line !== 'string');
  const widths = head.map((column, index) =>
    Math.max(
      displayColumns(column),
      ...rows.map((row) => displayColumns(row[index] ?? ''))
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
    ...body.map((entry) => (typeof entry === 'string' ? entry : line(entry))),
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

/** One `table` block, a heading line as a bold first cell; the Slack envelope degrades one Slack would reject. */
export const slackTable = (
  head: SlackTableRow,
  lines: readonly (SlackTableRow | string)[]
): SlackBlock => ({
  type: 'table',
  rows: [
    head,
    ...lines.map((line) =>
      typeof line === 'string'
        ? [[richTextRun(line, { bold: true })], ...head.slice(1).map(() => [])]
        : line
    ),
  ].map((row) => row.map(slackTableCell)),
  column_settings: head.map(() => ({ is_wrapped: true })),
});
