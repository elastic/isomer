/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackRichTextText,
  type SlackTableCell,
} from '@elastic/isomer-sdk/slack';

import { richTextRun } from './marks';
import { displayColumns } from './mono';
import { richTextBreak, richTextSection, slackRichText } from './slack_text';

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

const runsLength = (runs: readonly SlackRichTextText[]): number =>
  runs.reduce((total, { text }) => total + text.length, 0);

const bolded = (runs: readonly SlackRichTextText[]): SlackRichTextText[] =>
  runs.map((run) => ({ ...run, style: { ...run.style, bold: true } }));

/**
 * A `table` block when Slack keeps every cell whole.
 * Otherwise rich text: each row as `column: cell` lines, a heading line bold, and a blank line between.
 */
export const slackTable = (
  head: SlackTableRow,
  lines: readonly (SlackTableRow | string)[]
): SlackBlock => {
  const rows = lines.map((line) =>
    typeof line === 'string'
      ? [[richTextRun(line, { bold: true })], ...head.slice(1).map(() => [])]
      : line
  );
  const fits =
    rows.length + 1 <= SLACK_LIMITS.tableRows &&
    head.length <= SLACK_LIMITS.tableColumns &&
    [head, ...rows]
      .flat()
      .reduce((total, cell) => total + runsLength(cell), 0) <=
      SLACK_LIMITS.tableCellCharsPerMessage;
  if (fits) {
    return {
      type: 'table',
      rows: [head, ...rows].map((row) => row.map(slackTableCell)),
      column_settings: head.map(() => ({ is_wrapped: true })),
    };
  }
  const entries = lines.map((line) =>
    typeof line === 'string'
      ? [richTextRun(line, { bold: true })]
      : line
          .flatMap((cell, index) => {
            const column = head[index] ?? [];
            return runsLength(cell) === 0
              ? []
              : [
                  richTextBreak,
                  ...(runsLength(column) === 0
                    ? []
                    : [...bolded(column), richTextRun(': ')]),
                  ...cell,
                ];
          })
          .slice(1)
  );
  return slackRichText(
    richTextSection(
      ...entries.flatMap((entry, index) => [
        ...(index > 0 ? [richTextBreak, richTextBreak] : []),
        ...entry,
      ])
    )
  );
};
