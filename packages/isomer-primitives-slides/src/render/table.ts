/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const escapeCell = (cell: string): string =>
  cell.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/** One GFM pipe-table row. */
export const markdownRow = (cells: readonly string[]): string =>
  `| ${cells.map(escapeCell).join(' | ')} |`;

/** A GFM pipe table. The Slack fallback turns it into a native `table` block. */
export const markdownTable = (
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): string =>
  [
    markdownRow(columns),
    markdownRow(columns.map(() => '---')),
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
