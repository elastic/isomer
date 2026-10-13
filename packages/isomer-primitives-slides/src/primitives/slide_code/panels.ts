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
import { withGutter } from '../line_gutter';

import { panelGutter, panelLines, type SlideCodePanel } from './schema';

const traceArrow = slideDistillery.tokens.code.traceArrow.value;

const printedLines = (panel: SlideCodePanel): string[] => {
  const gutter = panelGutter(panel);
  return panelLines(panel).map((line, index) =>
    withGutter(gutter?.[index], line)
  );
};

/** Panels as text, each after its file, joined by the trace arrow. */
export const panelsText = (panels: readonly SlideCodePanel[]): string =>
  panels
    .map((panel) =>
      [
        ...(panel.file ? [oneLine(panel.file)] : []),
        ...printedLines(panel),
      ].join('\n')
    )
    .join(`\n\n${traceArrow}\n\n`);

export const panelsMarkdown = (panels: readonly SlideCodePanel[]) =>
  panels.flatMap((panel, index) => [
    ...(index > 0 ? [md.paragraph(traceArrow)] : []),
    ...(panel.file ? [md.paragraph(md.strong(panel.file))] : []),
    md.codeBlock(printedLines(panel).join('\n'), panel.language),
  ]);

export const panelsSlack = (panels: readonly SlideCodePanel[]): SlackBlock[] =>
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
