/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { richTextSection, slackRichText, slackSection } from '../../render';
import { richTextRun } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideDiffLine, type SlideDiffNode } from './schema';

export type { SlideDiffLine, SlideDiffNode } from './schema';

const { marker } = slideDistillery.tokens.diff;

const unified = (lines: readonly SlideDiffLine[]): string =>
  lines
    .map(({ text, op }) => `${marker[op ?? 'context'].value}${text}`)
    .join('\n');

export const text = ({ file, lines }: SlideDiffNode): string =>
  [...(file ? [oneLine(file)] : []), unified(lines)].join('\n');

export const markdown = ({ file, lines }: SlideDiffNode) => [
  ...(file ? [md.paragraph(md.strong(file))] : []),
  md.codeBlock(unified(lines), 'diff'),
];

export const slack = ({ file, lines }: SlideDiffNode): SlackBlock[] => {
  const source = unified(lines);
  return [
    slackSection(
      [file ? escapeMrkdwn(oneLine(file)) : '', codeBlock(source)]
        .filter(Boolean)
        .join('\n'),
      () =>
        slackRichText(...(file ? [richTextSection(richTextRun(file))] : []), {
          type: 'rich_text_preformatted',
          elements: [{ type: 'text', text: source }],
        })
    ),
  ];
};

export const slideDiffPrimitive = definePrimitive({
  type: 'slideDiff',
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
