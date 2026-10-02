/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  richTextRun as run,
  stripMarks,
  strongMarksMarkdown,
  strongMarksRichText,
} from '../../render/marks';
import { slackTable, textTable } from '../../render/table';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideMatrixNode } from './schema';

export type { SlideMatrixNode, SlideMatrixRow } from './schema';

const { markWords } = slideDistillery.tokens.matrix;

const words = (marks: SlideMatrixNode['rows'][number]['marks']) =>
  marks.map((kind) => markWords[kind].value);

/** The highlighted column's heading leads with its cue. */
const heads = ({ columns, highlight }: SlideMatrixNode): string[] =>
  columns.map((column, index) =>
    index === highlight ? `${toneCueText('primary')}${column}` : column
  );

export const text = (node: SlideMatrixNode): string =>
  textTable(
    ['', ...heads(node).map(stripMarks)],
    node.rows.map(({ label, marks }) => [stripMarks(label), ...words(marks)])
  );

/** The highlighted column's heading is also bold. */
export const markdown = (node: SlideMatrixNode) =>
  md.table(
    [
      '',
      ...heads(node).map((column, index) =>
        index === node.highlight
          ? strongMarksMarkdown(column)
          : marksMarkdown(column)
      ),
    ],
    node.rows.map(({ label, marks }) => [marksMarkdown(label), ...words(marks)])
  );

export const slack = (node: SlideMatrixNode): SlackBlock[] => [
  slackTable(
    [
      [],
      ...heads(node).map((column, index) =>
        index === node.highlight
          ? strongMarksRichText(column)
          : marksRichText(column)
      ),
    ],
    node.rows.map(({ label, marks }) => [
      marksRichText(label),
      ...words(marks).map((word) => [run(word)]),
    ])
  ),
];

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
    slack,
  },
});
