/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bold,
  SLACK_LIMITS,
  type SlackBlock,
  type SlackTableCell,
} from '@elastic/isomer-sdk/slack';

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTableNode } from './schema';

export type { SlideTableNode } from './schema';

const escapeCell = (cell: string): string =>
  cell.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/** Text renderer for {@link SlideTableNode}: space-padded columns. */
export const text = (node: SlideTableNode): string => {
  const widths = node.columns.map((column, index) =>
    Math.max(column.length, ...node.rows.map((row) => row[index]!.length))
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]!))
      .join('  ')
      .trimEnd();
  return [
    node.label ?? '',
    line(node.columns),
    line(widths.map((width) => '-'.repeat(width))),
    ...node.rows.map(line),
  ]
    .filter(Boolean)
    .join('\n');
};

/** Markdown renderer for {@link SlideTableNode}: a GFM pipe table. */
export const markdown = (node: SlideTableNode): string => {
  const line = (cells: readonly string[]) =>
    `| ${cells.map(escapeCell).join(' | ')} |`;
  return [
    node.label ? `### ${node.label}\n` : '',
    line(node.columns),
    line(node.columns.map(() => '---')),
    ...node.rows.map(line),
  ]
    .filter(Boolean)
    .join('\n');
};

const boldCell = (text: string): SlackTableCell => ({
  type: 'rich_text',
  elements: [
    {
      type: 'rich_text_section',
      elements: [{ type: 'text', text, style: { bold: true } }],
    },
  ],
});

/**
 * Slack renderer for {@link SlideTableNode}: a native `table` block whose row
 * headers stay bold, which the markdown fallback's `raw_text` cells cannot carry.
 */
export const slack = (node: SlideTableNode): SlackBlock[] => [
  ...(node.label
    ? [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: bold(node.label) },
        } satisfies SlackBlock,
      ]
    : []),
  {
    type: 'table',
    rows: [node.columns, ...node.rows]
      .slice(0, SLACK_LIMITS.tableRows)
      .map((row, rowIndex) =>
        row.map((cell, index) =>
          node.rowHeaders && rowIndex > 0 && index === 0 && cell
            ? boldCell(cell)
            : { type: 'raw_text', text: cell }
        )
      ),
    column_settings: node.columns.map(() => ({ is_wrapped: true })),
  },
];

/** Catalog, schema, and renderers for {@link SlideTableNode}. */
export const slideTablePrimitive = definePrimitive({
  type: 'slideTable',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
