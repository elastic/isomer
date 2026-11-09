/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Text and Markdown from the Scene. Every string is the Scene's own; columns
// the Scene flags as empty are left out of its table.

import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';

import type { Scene, SceneTable } from '../scene/types';

/** The authored description, when the node has one. */
export const described = ({ description }: Scene): string[] =>
  description ? [description] : [];

/** The Scene's emphasis notes, in order. */
export const sceneNotes = ({ interactions }: Scene): string[] =>
  interactions.emphasis.flatMap(({ note }) => (note ? [note] : []));

const shownColumns = (table: SceneTable) =>
  table.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.empty);

// The Scene's table: a header row, one row per data row in `data` order, then
// the footer; or nothing when there is no row or no shown column.
const tableOf = ({ table }: Scene): string[][] | undefined => {
  const columns = shownColumns(table);
  if (table.rows.length === 0 || columns.length === 0) {
    return undefined;
  }
  const { footer } = table;
  return [
    columns.map(({ column }) => column.label),
    ...table.rows.map(({ cells }) =>
      columns.map(({ index }) => cells[index] ?? '')
    ),
    ...(footer ? [columns.map(({ index }) => footer[index] ?? '')] : []),
  ];
};

/**
 * The summary, description and each emphasis note on its own line, then the
 * table and its footer with cells separated by ` | `, then the link, each as
 * its own paragraph.
 */
export const sceneToText = (scene: Scene): string => {
  const { link } = scene.interactions;
  const table = tableOf(scene);
  return [
    [scene.summary, ...described(scene), ...sceneNotes(scene)].join('\n'),
    ...(table ? [table.map((row) => row.join(' | ')).join('\n')] : []),
    ...(link ? [`${link.label}: ${link.href}`] : []),
  ].join('\n\n');
};

/** The summary, description, each emphasis note, the table and its footer as a GFM table, and the link. */
export const sceneToMarkdown = (scene: Scene): MarkdownContent => {
  const { link } = scene.interactions;
  const [header, ...rows] = tableOf(scene) ?? [];
  return [
    md.paragraph(scene.summary),
    ...described(scene).map((description) => md.paragraph(description)),
    ...sceneNotes(scene).map((note) => md.paragraph(md.emphasis(note))),
    ...(header ? [md.table(header, rows)] : []),
    ...(link ? [md.paragraph(md.link(link.label, link.href))] : []),
  ];
};
