/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What an embedded body looks like on each surface: a drawn slide is quoted, so its headings stay out of the outer outline, and a surface's output is shown as the lines the panel prints.

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';
import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';
import {
  escapeMrkdwn,
  type SlackAssetCollector,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import {
  renderMarkdownChildren,
  renderSlackChildren,
  renderTextChildren,
} from '../../render/children';
import type { SlideRenderScope } from '../../render/context';
import { slackRichText } from '../../render/slack_text';
import { slideDistillery } from '../../theme/distillery';
import type { SlideRenderSurface } from '../../theme/variants';

const { separator, slackTypeColumn } = slideDistillery.tokens.render;
const typeColumn = Number(slackTypeColumn.value);

const LINE_TERMINATORS = /\r\n|[\n\r\u2028\u2029]/;

export type OutputSurface = Exclude<
  SlideRenderSurface,
  'react' | 'html' | 'svg'
>;

export const isDrawn = (
  surface: SlideRenderSurface
): surface is 'react' | 'html' | 'svg' =>
  surface === 'react' || surface === 'html' || surface === 'svg';

/** The slide reference, if any, then the surface. */
export const renderLabel = ({
  slide,
  surface,
}: {
  slide?: string | undefined;
  surface: SlideRenderSurface;
}): string =>
  [slide && oneLine(slide), surface]
    .filter(Boolean)
    .join(` ${separator.value} `);

/** The caption, then what is rendered and where: every surface's line above a render. */
export const headline = (node: {
  caption?: string | undefined;
  slide?: string | undefined;
  surface: SlideRenderSurface;
}): string =>
  [node.caption && oneLine(node.caption), renderLabel(node)]
    .filter(Boolean)
    .join(` ${separator.value} `);

/** Every `text` and `alt_text` string in `value`, in document order. */
const textsIn = (value: unknown): string[] => {
  const texts: string[] = [];
  const stack: ({ text: string } | { value: unknown })[] = [{ value }];
  for (let next = stack.pop(); next; next = stack.pop()) {
    if ('text' in next) {
      texts.push(next.text);
      continue;
    }
    const { value: current } = next;
    if (typeof current !== 'object' || current === null) {
      continue;
    }
    const entries: [string, unknown][] = Array.isArray(current)
      ? current.map((item) => ['', item])
      : Object.entries(current);
    for (let at = entries.length - 1; at >= 0; at -= 1) {
      const [key, child] = entries[at]!;
      stack.push(
        (key === 'text' || key === 'alt_text') && typeof child === 'string'
          ? { text: child }
          : { value: child }
      );
    }
  }
  return texts;
};

/** Slack blocks one per line: the block type, padded, then its text. */
const slackLines = (blocks: readonly SlackBlock[]): string[] =>
  blocks.map(({ type, ...rest }) =>
    `${type.padEnd(Math.max(typeColumn, type.length + 1))}${textsIn(rest).join(' ').replace(/\s+/g, ' ').trim()}`.trimEnd()
  );

/** What `surface` outputs for `body`, one entry per non-blank line. */
export const outputLines = (
  surface: OutputSurface,
  body: readonly PrimitiveNode[],
  scope: SlideRenderScope
): string[] =>
  (surface === 'slack'
    ? slackLines(renderSlackChildren(body, scope, undefined))
    : (surface === 'text'
        ? renderTextChildren(body, scope)
        : body.map((node) => scope.renderMarkdown(node)).join('\n\n')
      ).split(LINE_TERMINATORS)
  ).filter((line) => line.trim() !== '');

export const embeddedText = (
  body: readonly PrimitiveNode[],
  surface: SlideRenderSurface,
  scope: SlideRenderScope
): string =>
  (isDrawn(surface)
    ? renderTextChildren(body, scope).split(LINE_TERMINATORS)
    : outputLines(surface, body, scope)
  )
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');

export const embeddedMarkdown = (
  body: readonly PrimitiveNode[],
  surface: SlideRenderSurface,
  scope: SlideRenderScope
): MarkdownContent =>
  isDrawn(surface)
    ? md.blockquote(renderMarkdownChildren(body, scope))
    : md.codeBlock(outputLines(surface, body, scope).join('\n'));

/** A drawn slide's `header` blocks become bold sections, so the outer message keeps one header. */
export const embeddedSlack = (
  body: readonly PrimitiveNode[],
  surface: SlideRenderSurface,
  scope: SlideRenderScope,
  collector: SlackAssetCollector | undefined
): SlackBlock[] =>
  isDrawn(surface)
    ? renderSlackChildren(body, scope, collector).map((block) =>
        block.type === 'header'
          ? {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${escapeMrkdwn(block.text.text)}*`,
              },
            }
          : block
      )
    : [
        slackRichText({
          type: 'rich_text_preformatted',
          elements: [
            {
              type: 'text',
              text: outputLines(surface, body, scope).join('\n'),
            },
          ],
        }),
      ];
