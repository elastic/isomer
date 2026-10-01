/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCaption } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun as run,
} from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import {
  schema,
  type SlidePipelineNode,
  type SlidePipelineSpan,
  type SlidePipelineStep,
} from './schema';

export type {
  SlidePipelineNode,
  SlidePipelineSpan,
  SlidePipelineStep,
} from './schema';

const { arrow, dash, coverOpen, coverClose } = slideDistillery.tokens.pipeline;
const joiner = ` ${arrow.value} `;
const breaker = ` ${dash.value} `;
const termJoiner = slideDistillery.tokens.glyph.termJoiner.value;

const chain = (names: (string | undefined)[]): string =>
  names
    .filter((name): name is string => Boolean(name))
    .map(oneLine)
    .join(joiner);

const titles = (steps: SlidePipelineStep[]): string[] =>
  steps.map(({ title }) => title);

/** The first and last step a span covers, or its one step, then what joins them to the span's title. */
const covered = (
  steps: SlidePipelineStep[],
  { from, to }: SlidePipelineSpan
): string =>
  `${coverOpen.value}${chain(
    from === to ? [steps[from]?.title] : [steps[from]?.title, steps[to]?.title]
  )}${coverClose.value}${termJoiner}`;

export const text = ({ start, end, steps, spans }: SlidePipelineNode): string =>
  [
    chain([start, ...titles(steps), end]),
    ...(spans?.length
      ? spans.map(
          (span) =>
            `${toneCueText(span.tone)}${oneLine(span.label).toUpperCase()}${covered(steps, span)}${oneLine(span.title)}${breaker}${plainText(span.body)}`
        )
      : steps.map(
          ({ title, body }, index) =>
            `${index + 1}. ${oneLine(title)}${body ? `${breaker}${plainText(body)}` : ''}`
        )),
  ].join('\n');

export const markdown = ({ start, end, steps, spans }: SlidePipelineNode) => [
  md.paragraph(chain([start, ...titles(steps), end])),
  spans?.length
    ? md.list(
        spans.map((span) =>
          md.paragraph(
            toneCueText(span.tone),
            md.strong(span.label.toUpperCase()),
            covered(steps, span),
            span.title,
            breaker,
            ...marksMarkdown(span.body)
          )
        )
      )
    : md.list(
        steps.map(({ title, body }) =>
          md.paragraph(
            md.strong(title),
            ...(body ? [breaker, ...marksMarkdown(body)] : [])
          )
        ),
        { ordered: true }
      ),
];

export const slack = ({
  start,
  end,
  steps,
  spans,
}: SlidePipelineNode): SlackBlock[] => [
  slackCaption(chain([start, ...titles(steps), end])),
  {
    type: 'rich_text',
    elements: [
      spans?.length
        ? {
            type: 'rich_text_list',
            style: 'bullet',
            elements: spans.map((span) => ({
              type: 'rich_text_section',
              elements: [
                run(toneCueText(span.tone)),
                run(span.label.toUpperCase(), { bold: true }),
                run(covered(steps, span)),
                run(span.title),
                run(breaker),
                ...marksRichText(span.body),
              ],
            })),
          }
        : {
            type: 'rich_text_list',
            style: 'ordered',
            elements: steps.map(({ title, body }) => ({
              type: 'rich_text_section',
              elements: [
                run(title, { bold: true }),
                ...(body ? [run(breaker), ...marksRichText(body)] : []),
              ],
            })),
          },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlidePipelineNode}. */
export const slidePipelinePrimitive = definePrimitive({
  type: 'slidePipeline',
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
