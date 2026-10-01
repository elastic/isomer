/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import { richTextRun as run } from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slackTable, textTable } from '../../render/table';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTableNode, tableGroups } from './schema';

export type { SlideTableGroup, SlideTableNode } from './schema';

/** Headings, group labels, and the table label print uppercase, as drawn. */
const heads = ({ columns }: SlideTableNode): string[] =>
  columns.map((column) => column.toUpperCase());

export const text = (node: SlideTableNode): string => {
  const { label } = node;
  const table = textTable(
    heads(node),
    tableGroups(node).flatMap(({ label: group, rows }) => [
      ...(group ? [group.toUpperCase()] : []),
      ...rows,
    ])
  );
  return label ? `${oneLine(label).toUpperCase()}\n${table}` : table;
};

/** One GFM pipe table per group, under its label. */
export const markdown = (node: SlideTableNode) => {
  const { label, rowHeaders } = node;
  return [
    ...(label ? [md.boldSectionLabel(label)] : []),
    ...tableGroups(node).flatMap(({ label: group, rows }) => [
      ...(group ? [md.boldSectionLabel(group)] : []),
      md.table(
        heads(node),
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
  const { label, rowHeaders } = node;
  return [
    ...(label ? [slackCaption(label.toUpperCase(), true)] : []),
    slackTable(
      heads(node).map((column) => [run(column)]),
      tableGroups(node).flatMap(({ label: group, rows }) => [
        ...(group ? [group.toUpperCase()] : []),
        ...rows.map((row) =>
          row.map((cell, index) => [
            run(cell, rowHeaders && index === 0 ? { bold: true } : undefined),
          ])
        ),
      ])
    ),
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
