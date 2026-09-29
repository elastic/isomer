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
import { slackTableCell, textTable } from '../../render/table';
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

export const text = ({ columns, rows }: SlideMatrixNode): string =>
  textTable(
    ['', ...columns.map(stripMarks)],
    rows.map(({ label, marks }) => [stripMarks(label), ...words(marks)])
  );

/** The highlighted column's heading is bold. */
export const markdown = ({ columns, rows, highlight }: SlideMatrixNode) =>
  md.table(
    [
      '',
      ...columns.map((column, index) =>
        index === highlight
          ? strongMarksMarkdown(column)
          : marksMarkdown(column)
      ),
    ],
    rows.map(({ label, marks }) => [marksMarkdown(label), ...words(marks)])
  );

export const slack = ({
  columns,
  rows,
  highlight,
}: SlideMatrixNode): SlackBlock[] => [
  {
    type: 'table',
    rows: [
      [
        slackTableCell([run('')]),
        ...columns.map((column, index) =>
          slackTableCell(
            index === highlight
              ? strongMarksRichText(column)
              : marksRichText(column)
          )
        ),
      ],
      ...rows.map(({ label, marks }) => [
        slackTableCell(marksRichText(label)),
        ...words(marks).map((word) => slackTableCell([run(word)])),
      ]),
    ],
    column_settings: ['', ...columns].map(() => ({ is_wrapped: true })),
  },
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
