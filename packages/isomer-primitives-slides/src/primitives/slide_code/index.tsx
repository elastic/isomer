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

import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideCodeNode } from './schema';

export type { SlideCodeNode, SlideCodePanel } from './schema';

const traceArrow = slideDistillery.tokens.code.traceArrow.value;

/** Text renderer for {@link SlideCodeNode}: each panel under its caption, joined by an arrow. */
export const text = ({ panels }: SlideCodeNode): string =>
  panels
    .map(({ file, lines }) => [...(file ? [file] : []), ...lines].join('\n'))
    .join(`\n\n${traceArrow}\n\n`);

// A fence-info string only allows word-ish tokens; anything else would
// terminate the fence early or inject markdown.
const fenceInfoLanguage = (language: string | undefined): string =>
  language && /^[\w+#.-]+$/.test(language) ? language : 'text';

// The fence must be longer than any backtick run in the body, or the body
// closes it early.
const fenceFor = (code: string): string => {
  const longestRun = Math.max(
    2,
    ...(code.match(/`+/g) ?? []).map((run) => run.length)
  );
  return '`'.repeat(longestRun + 1);
};

/** Markdown renderer for {@link SlideCodeNode}: one fenced block per panel. */
export const markdown = ({ panels }: SlideCodeNode): string =>
  panels
    .map(({ file, language, lines }) => {
      const source = lines.join('\n');
      const fence = fenceFor(source);
      return [
        file ? `**${file}**` : '',
        `${fence}${fenceInfoLanguage(language)}\n${source}\n${fence}`,
      ]
        .filter(Boolean)
        .join('\n\n');
    })
    .join(`\n\n${traceArrow}\n\n`);

/** Slack renderer for {@link SlideCodeNode}: each panel's caption, then its code block. */
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
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [file ? escapeMrkdwn(file) : '', codeBlock(lines.join('\n'))]
          .filter(Boolean)
          .join('\n'),
      },
    } satisfies SlackBlock,
  ]);

/** Catalog, schema, and renderers for {@link SlideCodeNode}. */
export const slideCodePrimitive = definePrimitive({
  type: 'slideCode',
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
