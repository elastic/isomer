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
import { layoutModule, tonesModule } from '../../theme/modules';

import type { SlideFanoutNode } from './schema';
import { fanoutModule } from './styles';

/** React renderer for {@link SlideFanoutNode}. */
export const react = (
  { type, source, targets }: SlideFanoutNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: fanout } = fanoutModule;
  const { handles: layout } = layoutModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layout.fill)}>
      <div className={cls(context, fanout.diagram)}>
        <div className={cls(context, fanout.source)}>{source}</div>
        <div aria-hidden className={cls(context, fanout.stem)} />
        <ul className={cls(context, fanout.targets)}>
          {targets.map(({ name, body, tone }, index) => (
            <li
              key={index}
              className={cls(
                context,
                fanout.target,
                tone && tonesModule.handles.tone[tone]
              )}>
              <span
                aria-hidden
                className={cls(
                  context,
                  fanout.spine,
                  index === 0
                    ? fanout.spineFirst
                    : index === targets.length - 1
                      ? fanout.spineLast
                      : fanout.spineMiddle
                )}
              />
              <div
                aria-hidden
                className={cls(context, fanout.tick, tone && fanout.tonedTick)}
              />
              <div className={cls(context, fanout.label)}>
                <span
                  className={cls(
                    context,
                    fanout.name,
                    tone && fanout.tonedName
                  )}>
                  {name}
                </span>
                <span className={cls(context, fanout.body)}>{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
