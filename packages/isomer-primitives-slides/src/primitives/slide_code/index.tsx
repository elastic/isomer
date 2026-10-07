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

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideCodeNode } from './schema';

export type { SlideCodeNode, SlideCodePanel } from './schema';

const traceArrow = slideDistillery.tokens.code.traceArrow.value;

export const text = ({ panels }: SlideCodeNode): string =>
  panels
    .map(({ file, lines }) =>
      [...(file ? [oneLine(file)] : []), ...lines].join('\n')
    )
    .join(`\n\n${traceArrow}\n\n`);

export const markdown = ({ panels }: SlideCodeNode) =>
  panels.flatMap(({ file, language, lines }, index) => [
    ...(index > 0 ? [md.paragraph(traceArrow)] : []),
    ...(file ? [md.paragraph(md.strong(file))] : []),
    md.codeBlock(lines.join('\n'), language),
  ]);

export const slack = ({ panels }: SlideCodeNode): SlackBlock[] =>
  panels.flatMap(({ file, lines }, index) => [
    ...(index > 0
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: traceArrow },
          } satisfies SlackBlock,
        ]
      : []),
    slackCodePanel(lines.join('\n'), file),
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
