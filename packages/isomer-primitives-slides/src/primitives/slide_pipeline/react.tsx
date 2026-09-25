/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { pipelineFit } from '../../theme/components/pipeline';
import { layoutModule, tonesModule } from '../../theme/modules';
import type { SlideSize } from '../../theme/variants';
import { rowLoad, sizeForLoad } from '../size';

import type {
  SlidePipelineNode,
  SlidePipelineSpan,
  SlidePipelineStep,
} from './schema';
import { pipelineKey, pipelineModule } from './styles';

const { handles: pipeline } = pipelineModule;

const StepsMode = ({
  start,
  end,
  steps,
  step,
  context,
}: Pick<SlidePipelineNode, 'start' | 'end' | 'steps'> & {
  step: SlideSize;
  context: SlideRenderContext | undefined;
}) => (
  <div className={cls(context, pipeline.steps)}>
    <div aria-hidden className={cls(context, pipeline.rail)} />
    {start ? (
      <span className={cls(context, pipeline.terminal)}>{start}</span>
    ) : null}
    <ol className={cls(context, pipeline.list)}>
      {steps.map(({ title, body }, index) => (
        <li key={index} className={cls(context, pipeline.step)}>
          <span aria-hidden className={cls(context, pipeline.numeral)}>
            {index + 1}
          </span>
          <h3
            className={cls(context, pipeline.title, pipeline.titleSize[step])}>
            {title}
          </h3>
          {body ? (
            <p className={cls(context, pipeline.body, pipeline.bodySize[step])}>
              {body}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
    {end ? (
      <span className={cls(context, pipeline.terminal)}>{end}</span>
    ) : null}
  </div>
);

/** Grid line of step `index`: each step is a chip track followed by a connector track. */
const chipLine = (index: number): number => 2 * index + 1;

const SpansMode = ({
  steps,
  spans,
  context,
}: {
  steps: SlidePipelineStep[];
  spans: SlidePipelineSpan[];
  context: SlideRenderContext | undefined;
}) => {
  const placed = (start: number, end: number) => [
    pipeline.columnStart[pipelineKey(start)],
    pipeline.columnSpan[pipelineKey(end - start + 1)],
  ];
  return (
    <div
      className={cls(
        context,
        pipeline.grid,
        pipeline.columns[pipelineKey(steps.length)]
      )}>
      {steps.map(({ title }, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span aria-hidden className={cls(context, pipeline.connector)} />
          ) : null}
          <span className={cls(context, pipeline.chip)}>{title}</span>
        </Fragment>
      ))}
      {spans.map(({ from, to, tone, label, title, body }, index) => {
        const first = chipLine(from);
        const last = chipLine(to);
        // A caption takes the connector before its bracket too, for room to wrap.
        const captionFirst = from === 0 ? first : first - 1;
        const toned = tonesModule.handles.tone[tone];
        return (
          <Fragment key={index}>
            <span
              aria-hidden
              className={cls(
                context,
                pipeline.bracket,
                toned,
                ...placed(first, last)
              )}
            />
            <div
              className={cls(
                context,
                pipeline.caption,
                toned,
                ...placed(captionFirst, last)
              )}>
              <span className={cls(context, pipeline.captionLabel)}>
                {label}
              </span>
              <h3 className={cls(context, pipeline.captionTitle)}>{title}</h3>
              <p className={cls(context, pipeline.captionBody)}>{body}</p>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};

/** React renderer for {@link SlidePipelineNode}. */
export const react = (
  { start, end, steps, spans, size }: SlidePipelineNode,
  { context }: SlideReactEnv
): ReactNode => (
  <div className={cls(context, layoutModule.handles.fill)}>
    {spans?.length ? (
      <SpansMode {...{ steps, spans, context }} />
    ) : (
      <StepsMode
        step={sizeForLoad(
          size,
          rowLoad(steps.map(({ title, body }) => [title, body])),
          pipelineFit,
          context?.crowding
        )}
        {...{ start, end, steps, context }}
      />
    )}
  </div>
);
