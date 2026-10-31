/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  type MarkRun,
  marksMarkdown,
  marksRichText,
  parseMarks,
  plainText,
  richTextRun as run,
} from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { pending } from '../../render/pending';
import { richTextSection, slackRichText } from '../../render/slack_text';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideDeltaNode } from './schema';

export type { SlideDeltaNode, SlideDeltaPoint } from './schema';

const arrow = ` ${slideDistillery.tokens.delta.arrow.value} `;

/** Labels draw uppercase and bold; code keeps its case. */
const labelRuns = (label: string): MarkRun[] =>
  parseMarks(label).map((mark) =>
    mark.kind === 'code' ? mark : { ...mark, text: mark.text.toUpperCase() }
  );

/** `BEFORE 13 → AFTER 26. +13: body`, labels uppercase as drawn. */
export const text = ({ before, after, change, body }: SlideDeltaNode): string =>
  [before, after]
    .map(
      ({ label, value }) =>
        `${oneLine(
          labelRuns(label)
            .map(({ text: mark }) => mark)
            .join('')
        )} ${value ? oneLine(value) : pending.text}`
    )
    .join(arrow) +
  `. ${change ? `${oneLine(change)}: ` : ''}${plainText(body)}`;

const labelMarkdown = (label: string) =>
  md.strong(
    ...labelRuns(label).map(({ kind, text: mark }) =>
      kind === 'code' ? md.code(mark) : md.text(mark)
    )
  );

export const markdown = ({ before, after, change, body }: SlideDeltaNode) =>
  md.paragraph(
    labelMarkdown(before.label),
    ' ',
    before.value ?? pending.markdown,
    arrow,
    labelMarkdown(after.label),
    ' ',
    after.value ?? pending.markdown,
    '. ',
    ...(change ? [md.strong(change), ': '] : []),
    ...marksMarkdown(body)
  );

export const slack = ({
  before,
  after,
  change,
  body,
}: SlideDeltaNode): SlackBlock[] => [
  slackRichText(
    richTextSection(
      ...[before, after].flatMap(({ label, value }, index) => [
        ...(index > 0 ? [run(arrow)] : []),
        ...labelRuns(label).map(({ kind, text: mark }) =>
          run(mark, {
            bold: true,
            ...(kind === 'code' ? { code: true } : {}),
          })
        ),
        run(' '),
        value ? run(value) : pending.richText,
      ]),
      run('. '),
      ...(change ? [run(change, { bold: true }), run(': ')] : []),
      ...marksRichText(body)
    )
  ),
];

/** Catalog, schema, and renderers for {@link SlideDeltaNode}. */
export const slideDeltaPrimitive = definePrimitive({
  type: 'slideDelta',
  catalog,
  icon,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
