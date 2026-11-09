/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The `text` and `markdown` forms of a chart: its sentence, its table, and
// its link, in that order, as the charts pack writes a Scene.

import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';

import { cellText, primaryDataset } from './schema/datasets';
import type { VegaNode } from './schema/node';
import { withResults } from './schema/results';
import { isSpecObject } from './schema/spec';
import { formatTable } from './table_text';

/** Rows and columns of an untyped inline dataset the text surfaces show. */
export const INLINE_TABLE_ROWS = 10;
export const INLINE_TABLE_COLUMNS = 6;

/** `title: description`, or the description alone. */
export const summaryOf = ({ title, description }: VegaNode): string =>
  title ? `${title}: ${description}` : description;

interface Table {
  header: string[];
  rows: string[][];
  /** Rows left out of an inline dataset's table. */
  more: number;
}

/** `data` formatted; else the first inline dataset's first rows, as they are. */
const tableOf = (node: VegaNode): Table | undefined => {
  if (node.data) {
    const { columns, rows } = formatTable(node.data);
    return rows.length === 0 || columns.length === 0
      ? undefined
      : {
          header: columns.map(({ label }) => label),
          rows: rows.map((row) => [...row]),
          more: 0,
        };
  }
  if (!isSpecObject(node.spec)) {
    return undefined;
  }
  const dataset = primaryDataset(
    node.mode,
    withResults(node.spec, node.results)
  );
  if (!dataset) {
    return undefined;
  }
  const fields = dataset.fields.slice(0, INLINE_TABLE_COLUMNS);
  const shown = dataset.rows.slice(0, INLINE_TABLE_ROWS);
  return {
    header: [...fields],
    rows: shown.map((row) => fields.map((field) => cellText(row[field]))),
    more: dataset.rows.length - shown.length,
  };
};

const moreText = (more: number) =>
  `…and ${more} more row${more === 1 ? '' : 's'}.`;

/** The sentence, the table with cells separated by ` | `, then the link, each its own paragraph. */
export const vegaText = (node: VegaNode): string => {
  const table = tableOf(node);
  const link = node.interactions?.link;
  return [
    summaryOf(node),
    ...(table
      ? [
          [table.header, ...table.rows]
            .map((row) => row.join(' | '))
            .join('\n'),
          ...(table.more > 0 ? [moreText(table.more)] : []),
        ]
      : []),
    ...(link ? [`${link.label}: ${link.href}`] : []),
  ].join('\n\n');
};

/** The sentence, the table as a GFM table, then the link. */
export const vegaMarkdown = (node: VegaNode): MarkdownContent => {
  const table = tableOf(node);
  const link = node.interactions?.link;
  return [
    md.paragraph(summaryOf(node)),
    ...(table
      ? [
          md.table(table.header, table.rows),
          ...(table.more > 0
            ? [md.paragraph(md.emphasis(moreText(table.more)))]
            : []),
        ]
      : []),
    ...(link ? [md.paragraph(md.link(link.label, link.href))] : []),
  ];
};
