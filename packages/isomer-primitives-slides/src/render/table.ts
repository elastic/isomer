/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { displayColumns } from './mono';

/** A {@link textTable} body line: a row of cells, or a heading on a line of its own. */
export type TextTableLine = readonly string[] | string;

/** Space-padded columns under a dashed rule, every cell and heading on one line. */
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
