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
import { schema, type SlideTableNode, tableGroups } from './schema';

export type { SlideTableGroup, SlideTableNode } from './schema';

const escapeCell = (cell: string): string =>
  cell.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/** Text renderer for {@link SlideTableNode}: space-padded columns, a label line above each group. */
export const text = (node: SlideTableNode): string => {
  const { columns, label } = node;
  const groups = tableGroups(node);
  const allRows = groups.flatMap(({ rows }) => rows);
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...allRows.map((row) => row[index]?.length ?? 0))
  );
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join('  ')
      .trimEnd();
  return [
    label ?? '',
    line(columns),
    line(widths.map((width) => '-'.repeat(width))),
    ...groups.flatMap(({ label: group, rows }) => [
      ...(group ? [group.toUpperCase()] : []),
      ...rows.map(line),
    ]),
  ]
    .filter(Boolean)
    .join('\n');
};

/** Markdown renderer for {@link SlideTableNode}: a GFM pipe table, one per group under its label. */
export const markdown = (node: SlideTableNode): string => {
  const { columns, label } = node;
  const line = (cells: readonly string[]) =>
    `| ${cells.map(escapeCell).join(' | ')} |`;
  const head = [line(columns), line(columns.map(() => '---'))];
  return [
    label ? `## ${label}` : '',
    ...tableGroups(node).map(({ label: group, rows }) =>
      [...(group ? [`**${group}**`, ''] : []), ...head, ...rows.map(line)].join(
        '\n'
      )
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
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

const rawCell = (text: string): SlackTableCell => ({ type: 'raw_text', text });

/**
 * Slack renderer for {@link SlideTableNode}: one native `table` block whose row
 * headers stay bold. Each group opens with a row holding its bold label.
 */
export const slack = (node: SlideTableNode): SlackBlock[] => {
  const { columns, label, rowHeaders } = node;
  const body = tableGroups(node).flatMap(({ label: group, rows }) => [
    ...(group
      ? [[boldCell(group), ...columns.slice(1).map(() => rawCell(''))]]
      : []),
    ...rows.map((row) =>
      row.map((cell, index) =>
        rowHeaders && index === 0 && cell ? boldCell(cell) : rawCell(cell)
      )
    ),
  ]);
  return [
    ...(label
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: bold(label) },
          } satisfies SlackBlock,
        ]
      : []),
    {
      type: 'table',
      rows: [columns.map(rawCell), ...body].slice(0, SLACK_LIMITS.tableRows),
      column_settings: columns.map(() => ({ is_wrapped: true })),
    },
  ];
};

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
