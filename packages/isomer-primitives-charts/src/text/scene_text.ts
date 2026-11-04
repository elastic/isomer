/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Text and Markdown from the Scene: its summary sentence, then its table. Every
// string is the Scene's own; columns the Scene flags as empty are left out.

import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';

import type { Scene, SceneTable } from '../scene/types';

const shownColumns = (table: SceneTable) =>
  table.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.empty);

/** The Scene's table: a header row, then one row per data row, in `data` order. */
export const sceneTableRows = (table: SceneTable): string[][] => {
  const columns = shownColumns(table);
  return [
    columns.map(({ column }) => column.label),
    ...table.rows.map(({ cells }) =>
      columns.map(({ index }) => cells[index] ?? '')
    ),
  ];
};

/** The summary, then the table with cells separated by ` | `. */
export const sceneToText = (scene: Scene): string => {
  const [header, ...rows] = sceneTableRows(scene.table);
  if (!header || header.length === 0 || rows.length === 0) {
    return scene.summary;
  }
  return [
    scene.summary,
    '',
    ...[header, ...rows].map((row) => row.join(' | ')),
  ].join('\n');
};

/** The summary as a paragraph, then the table as a GFM table. */
export const sceneToMarkdown = (scene: Scene): MarkdownContent => {
  const [header, ...rows] = sceneTableRows(scene.table);
  return [
    md.paragraph(scene.summary),
    ...(header && header.length > 0 && rows.length > 0
      ? [md.table(header, rows)]
      : []),
  ];
};
