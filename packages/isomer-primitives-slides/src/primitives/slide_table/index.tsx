/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackTableCell,
} from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { richTextRun as run } from '../../render/marks';
import { slackTableCell, textTable } from '../../render/table';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTableNode, tableGroups } from './schema';

export type { SlideTableGroup, SlideTableNode } from './schema';

export const text = (node: SlideTableNode): string => {
  const { columns, label } = node;
  const table = textTable(
    columns,
    tableGroups(node).flatMap(({ label: group, rows }) => [
      ...(group ? [group.toUpperCase()] : []),
      ...rows,
    ])
  );
  return label ? `${oneLine(label).toUpperCase()}\n${table}` : table;
};

/** One GFM pipe table per group, under its label. */
export const markdown = (node: SlideTableNode) => {
  const { columns, label, rowHeaders } = node;
  return [
    ...(label ? [md.boldSectionLabel(label)] : []),
    ...tableGroups(node).flatMap(({ label: group, rows }) => [
      ...(group ? [md.boldSectionLabel(group)] : []),
      md.table(
        columns,
        rows.map((row) =>
          row.map((cell, index) =>
            rowHeaders && index === 0 ? md.strong(cell) : cell
          )
        )
      ),
    ]),
  ];
};

/** One native `table` block; each group opens with a bold label row. */
export const slack = (node: SlideTableNode): SlackBlock[] => {
  const { columns, label, rowHeaders } = node;
  const blank: SlackTableCell = { type: 'raw_text', text: '' };
  const body = tableGroups(node).flatMap(({ label: group, rows }) => [
    ...(group
      ? [
          [
            slackTableCell([run(group.toUpperCase(), { bold: true })]),
            ...columns.slice(1).map(() => blank),
          ],
        ]
      : []),
    ...rows.map((row) =>
      row.map((cell, index) =>
        slackTableCell([
          run(cell, rowHeaders && index === 0 ? { bold: true } : undefined),
        ])
      )
    ),
  ]);
  return [
    ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
    {
      type: 'table',
      rows: [
        columns.map((column) => slackTableCell([run(column)])),
        ...body,
      ].slice(0, SLACK_LIMITS.tableRows),
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
