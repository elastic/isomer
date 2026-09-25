/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const { arrow } = slideDistillery.tokens.pipeline;

const chain = (names: Array<string | undefined>): string =>
  names.filter(Boolean).join(` ${arrow.value} `);

const titles = (steps: SlidePipelineStep[]): string[] =>
  steps.map(({ title }) => title);

const covered = (
  steps: SlidePipelineStep[],
  { from, to }: SlidePipelineSpan
): string =>
  chain(
    from === to ? [steps[from]?.title] : [steps[from]?.title, steps[to]?.title]
  );

const detail = (title: string, body: string | undefined): string =>
  body ? `${title} — ${body}` : title;

/** Text renderer for {@link SlidePipelineNode}: the chain, then a line per step (steps mode) or per span. */
export const text = ({ start, end, steps, spans }: SlidePipelineNode): string =>
  [
    chain([start, ...titles(steps), end]),
    ...(spans?.length
      ? spans.map(
          (span) =>
            `${span.label} (${covered(steps, span)}): ${detail(span.title, span.body)}`
        )
      : steps.map(
          ({ title, body }, index) => `${index + 1}. ${detail(title, body)}`
        )),
  ].join('\n');

/** Markdown renderer for {@link SlidePipelineNode}: the chain, then an ordered list of steps or a list of spans. */
export const markdown = ({
  start,
  end,
  steps,
  spans,
}: SlidePipelineNode): string =>
  [
    chain([start, ...titles(steps), end]),
    spans?.length
      ? spans
          .map(
            (span) =>
              `- **${span.label}** (${covered(steps, span)}): ${detail(span.title, span.body)}`
          )
          .join('\n')
      : steps
          .map(
            ({ title, body }, index) =>
              `${index + 1}. ${detail(`**${title}**`, body)}`
          )
          .join('\n'),
  ].join('\n\n');

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
  },
});
