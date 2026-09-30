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
import { schema, type SlideBarsNode } from './schema';
import { barValue } from './value';

export type { SlideBarsItem, SlideBarsNode } from './schema';

const { heads } = slideDistillery.tokens.bars;

/** Label, value, and detail when any bar has one; the highlighted row's label leads with its cue. */
const table = ({ items }: SlideBarsNode) => {
  const details = items.some(({ detail }) => detail);
  return {
    head: [
      heads.label.value,
      heads.value.value,
      ...(details ? [heads.detail.value] : []),
    ],
    rows: items.map(({ label, value, detail, highlight = false }) => ({
      cells: [
        highlight ? `${toneCueText('primary')}${label}` : label,
        barValue(value),
        ...(details ? [detail ?? ''] : []),
      ],
      highlight,
    })),
  };
};

export const text = (node: SlideBarsNode): string => {
  const { head, rows } = table(node);
  return textTable(
    head,
    rows.map(({ cells }) => cells.map(stripMarks))
  );
};

/** The highlighted row is also bold. */
export const markdown = (node: SlideBarsNode) => {
  const { head, rows } = table(node);
  return md.table(
    head,
    rows.map(({ cells, highlight }) =>
      cells.map((cell) =>
        highlight ? strongMarksMarkdown(cell) : marksMarkdown(cell)
      )
    )
  );
};

export const slack = (node: SlideBarsNode): SlackBlock[] => {
  const { head, rows } = table(node);
  return [
    slackTable(
      head.map((cell) => [run(cell)]),
      rows.map(({ cells, highlight }) =>
        cells.map((cell) =>
          highlight ? strongMarksRichText(cell) : marksRichText(cell)
        )
      )
    ),
  ];
};

/** Catalog, schema, and renderers for {@link SlideBarsNode}. */
export const slideBarsPrimitive = definePrimitive({
  type: 'slideBars',
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
