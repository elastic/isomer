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
import { ToneCue } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, tonesModule } from '../../theme/modules';

import type { SlideFanoutNode } from './schema';
import { fanoutModule } from './styles';

const { label: connectorLabel } = slideDistillery.tokens.connector;
const { toneLabel: labels } = slideDistillery.tokens.fanout;

/** React renderer for {@link SlideFanoutNode}. */
export const react = (
  { type, source, targets }: SlideFanoutNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: fanout } = fanoutModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, fanout.diagram)}>
        <div className={cls(context, fanout.source)}>{source}</div>
        <div
          role="img"
          aria-label={connectorLabel.value}
          className={cls(context, fanout.stem)}
        />
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
                className={cls(context, fanout.tick, tone && fanout.tickToned)}
              />
              <div className={cls(context, fanout.label)}>
                <span
                  className={cls(
                    context,
                    fanout.name,
                    tone && fanout.nameToned
                  )}>
                  <ToneCue {...{ tone, context, labels }} />
                  {name}
                </span>{' '}
                <span className={cls(context, fanout.body)}>{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
