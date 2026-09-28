/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { fencedBlock } from '../../render/fence';
import { markdownText, singleLine } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideDiffLine, type SlideDiffNode } from './schema';

export type { SlideDiffLine, SlideDiffNode } from './schema';

const prefix = { add: '+', remove: '-' } as const;

/** Each line in unified-diff form: `+`, `-`, or a space, then the text. */
const unified = (lines: readonly SlideDiffLine[]): string =>
  lines
    .map(({ text, op }) => `${op ? prefix[op] : ' '} ${text}`.trimEnd())
    .join('\n');

/** Text renderer for {@link SlideDiffNode}: the caption, then the lines in unified-diff form. */
export const text = ({ file, lines }: SlideDiffNode): string =>
  [...(file ? [singleLine(file)] : []), unified(lines)].join('\n');

/** Markdown renderer for {@link SlideDiffNode}: a `diff` fence under the caption. */
export const markdown = ({ file, lines }: SlideDiffNode): string =>
  [file ? `**${markdownText(file)}**` : '', fencedBlock(unified(lines), 'diff')]
    .filter(Boolean)
    .join('\n\n');

/** Slack renderer for {@link SlideDiffNode}: the caption, then a code block. */
export const slack = ({ file, lines }: SlideDiffNode): SlackBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: [
        file ? escapeMrkdwn(singleLine(file)) : '',
        codeBlock(unified(lines)),
      ]
        .filter(Boolean)
        .join('\n'),
    },
  },
];

/** Catalog, schema, and renderers for {@link SlideDiffNode}. */
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
