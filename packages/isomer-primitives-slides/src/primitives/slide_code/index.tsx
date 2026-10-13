/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCodePanel } from '../../render';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';
import { withGutter } from '../line_gutter';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import {
  panelGutter,
  schema,
  type SlideCodeNode,
  type SlideCodePanel,
} from './schema';

export type { SlideCodeNode, SlideCodePanel } from './schema';

const traceArrow = slideDistillery.tokens.code.traceArrow.value;

/** A panel's lines as printed, each after its line number when it has one. */
const printedLines = (panel: SlideCodePanel): string[] => {
  const gutter = panelGutter(panel);
  return panel.lines.map((line, index) => withGutter(gutter?.[index], line));
};

export const text = ({ panels }: SlideCodeNode): string =>
  panels
    .map((panel) =>
      [
        ...(panel.file ? [oneLine(panel.file)] : []),
        ...printedLines(panel),
      ].join('\n')
    )
    .join(`\n\n${traceArrow}\n\n`);

export const markdown = ({ panels }: SlideCodeNode) =>
  panels.flatMap((panel, index) => [
    ...(index > 0 ? [md.paragraph(traceArrow)] : []),
    ...(panel.file ? [md.paragraph(md.strong(panel.file))] : []),
    md.codeBlock(printedLines(panel).join('\n'), panel.language),
  ]);

export const slack = ({ panels }: SlideCodeNode): SlackBlock[] =>
  panels.flatMap((panel, index) => [
    ...(index > 0
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: traceArrow },
          } satisfies SlackBlock,
        ]
      : []),
    slackCodePanel(printedLines(panel).join('\n'), panel.file),
  ]);

/** Catalog, schema, and renderers for {@link SlideCodeNode}. */
export const slideCodePrimitive = definePrimitive({
  type: 'slideCode',
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
