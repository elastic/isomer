/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { timelineFit } from '../../theme/components/timeline';
import { slideDistillery } from '../../theme/distillery';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';
import { rowLoad, sizeForLoad } from '../size';

import type { SlideTimelineNode } from './schema';
import { timelineModule } from './styles';

const { quoteOpen, quoteClose } = slideDistillery.tokens.timeline;

/** React renderer for {@link SlideTimelineNode}. */
export const react = (
  { items, size }: SlideTimelineNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: timeline } = timelineModule;
  const step = sizeForLoad(
    size,
    rowLoad(items.map(({ heading, body }) => [heading, body])),
    timelineFit,
    context?.crowding
  );
  const { handles: label } = labelModule;
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
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
                    )}>
                    {quoteOpen.value}
                    {heading}
                    {quoteClose.value}
                  </h3>
                  <p
                    className={cls(
                      context,
                      timeline.body,
                      timeline.bodySize[step]
                    )}>
                    {body}
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
