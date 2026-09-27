/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { marksMarkdown } from './marks';

/** One GFM pipe-table row of authored cells, marks kept and everything else escaped. */
export const markdownRow = (cells: readonly string[]): string =>
  `| ${cells.map(marksMarkdown).join(' | ')} |`;

/** The delimiter row under a GFM table's header. */
export const markdownDelimiterRow = (count: number): string =>
  `| ${Array.from({ length: count }, () => '---').join(' | ')} |`;

/** A GFM pipe table. The Slack fallback turns it into a native `table` block. */
export const markdownTable = (
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): string =>
  [
    markdownRow(columns),
    markdownDelimiterRow(columns.length),
    ...rows.map(markdownRow),
  ].join('\n');

/** Space-padded columns under a dashed rule. */
export const textTable = (
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): string => {
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => row[index]?.length ?? 0))
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join('  ')
      .trimEnd();
  return [
    line(columns),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map(line),
  ].join('\n');
};
