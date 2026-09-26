/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact, stripMarks } from '../../render/marks';
import { timelineFit } from '../../theme/components/timeline';
import { slideDistillery } from '../../theme/distillery';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';
import { rowLoad, sizeForLoad } from '../size';

import { timelineHeadingHeight } from './fit';
import type { SlideTimelineNode } from './schema';
import { timelineModule } from './styles';

const { quoteOpen, quoteClose } = slideDistillery.tokens.timeline;

/** React renderer for {@link SlideTimelineNode}. */
export const react = (
  { type, items, size }: SlideTimelineNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: timeline } = timelineModule;
  const step = sizeForLoad(
    size,
    rowLoad(
      items.map(({ heading, body }) => [stripMarks(heading), stripMarks(body)])
    ),
    timelineFit,
    context?.crowding
  );
  const { handles: label } = labelModule;
  const headingHeight = timelineHeadingHeight(
    items.map(({ heading }) => heading),
    step
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, timeline.row)}>
        <div aria-hidden className={cls(context, timeline.rail)} />
        <ol className={cls(context, timeline.list)}>
          {items.map(
            ({ label: when, channel, heading, body, current }, index) => {
              return (
                <li
                  key={index}
                  aria-current={current ? 'step' : undefined}
                  className={cls(context, timeline.item)}>
                  <span
                    className={cls(
                      context,
                      timeline.label,
                      current ? timeline.labelCurrent : timeline.labelPast
                    )}>
                    {when}
                  </span>
                  <span
                    className={cls(
                      context,
                      timeline.dot,
                      current ? timeline.dotCurrent : timeline.dotPast
                    )}
                  />
                  <span
                    className={cls(
                      context,
                      label.label,
                      timeline.channel,
                      current ? label.toned : undefined,
                      current ? tonesModule.handles.tone.primary : undefined
                    )}>
                    {channel}
                  </span>
                  <h3
                    className={cls(
                      context,
                      timeline.heading,
                      timeline.headingSize[step]
                    )}
                    style={{ minHeight: `${headingHeight}px` }}>
                    {quoteOpen.value}
                    {marksReact(heading, context, 'primary')}
                    {quoteClose.value}
                  </h3>
                  <p
                    className={cls(
                      context,
                      timeline.body,
                      timeline.bodySize[step]
                    )}>
                    {marksReact(body, context)}
                  </p>
                </li>
              );
            }
          )}
        </ol>
      </div>
    </div>
  );
};
