/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { markdownTable, textTable } from '../../render/table';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideMatrixNode } from './schema';

export type { SlideMatrixNode, SlideMatrixRow } from './schema';

const { markWords } = slideDistillery.tokens.matrix;

const table = ({ columns, rows }: SlideMatrixNode) => ({
  head: ['', ...columns],
  body: rows.map(({ label, marks }) => [
    label,
    ...marks.map((kind) => markWords[kind].value),
  ]),
});

/** Text renderer for {@link SlideMatrixNode}: a padded table of mark words. */
export const text = (node: SlideMatrixNode): string => {
  const { head, body } = table(node);
  return textTable(
    head.map(stripMarks),
    body.map((row) => row.map(stripMarks))
  );
};

/** Markdown renderer for {@link SlideMatrixNode}: a pipe table of mark words, which Slack draws natively. */
export const markdown = (node: SlideMatrixNode): string => {
  const { head, body } = table(node);
  return markdownTable(head, body);
};

/** Catalog, schema, and renderers for {@link SlideMatrixNode}. */
export const slideMatrixPrimitive = definePrimitive({
  type: 'slideMatrix',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
