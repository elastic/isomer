/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, tonesModule } from '../../theme/modules';
import { countKey, type SlideSize } from '../../theme/variants';

import { pipelineStep } from './fit';
import type {
  SlidePipelineNode,
  SlidePipelineSpan,
  SlidePipelineStep,
} from './schema';
import { pipelineModule } from './styles';

const { handles: pipeline } = pipelineModule;
const { label: connectorLabel } = slideDistillery.tokens.connector;

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
    {start ? (
      <>
        <span className={cls(context, pipeline.terminal)}>{start}</span>
        <span aria-hidden className={cls(context, pipeline.stub)} />
      </>
    ) : null}
    <div className={cls(context, pipeline.track)}>
      <div
        aria-hidden
        className={cls(
          context,
          pipeline.rail,
          start ? undefined : pipeline.railFromFirst[countKey(steps.length)],
          end ? undefined : pipeline.railToLast[countKey(steps.length)]
        )}
      />
      <ol className={cls(context, pipeline.list)}>
        {steps.map(({ title, body }, index) => (
          <li key={index} className={cls(context, pipeline.step)}>
            <span aria-hidden className={cls(context, pipeline.numeral)}>
              {index + 1}
            </span>
            <strong
              className={cls(
                context,
                pipeline.title,
                pipeline.titleSize[step]
              )}>
              {title}
            </strong>
            {body ? (
              <p
                className={cls(
                  context,
                  pipeline.body,
                  pipeline.bodySize[step]
                )}>
                {marksReact(body, context)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
    {end ? (
      <>
        <span aria-hidden className={cls(context, pipeline.stub)} />
        <span className={cls(context, pipeline.terminal)}>{end}</span>
      </>
    ) : null}
  </div>
);

/** Each step is a chip track, then a connector track. */
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
    pipeline.columnStart[countKey(start)],
    pipeline.columnSpan[countKey(end - start + 1)],
  ];
  return (
    <div
      className={cls(
        context,
        pipeline.grid,
        pipeline.columns[countKey(steps.length)]
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
        // A caption also takes the connector before its bracket, for room to wrap.
        const captionFirst = from === 0 ? first : first - 1;
        const toned = tonesModule.handles.tone[tone];
        const covered =
          from === to
            ? steps[from]?.title
            : `${steps[from]?.title} ${connectorLabel.value} ${steps[to]?.title}`;
        return (
          <Fragment key={index}>
            <span
              role="img"
              aria-label={covered}
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
              <strong className={cls(context, pipeline.captionLabel)}>
                <ToneCue {...{ tone, context }} />
                {label}
              </strong>
              <p className={cls(context, pipeline.captionTitle)}>{title}</p>
              <p className={cls(context, pipeline.captionBody)}>
                {marksReact(body, context)}
              </p>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};

/** React renderer for {@link SlidePipelineNode}. */
export const react = (
  node: SlidePipelineNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, start, end, steps, spans } = node;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      {spans?.length ? (
        <SpansMode {...{ steps, spans, context }} />
      ) : (
        <StepsMode
          step={pipelineStep(node, context)}
          {...{ start, end, steps, context }}
        />
      )}
    </div>
  );
};
