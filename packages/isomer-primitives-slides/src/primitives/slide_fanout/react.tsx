/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { layoutModule } from '../../theme/modules';

import type { SlideFanoutNode } from './schema';
import { fanoutModule } from './styles';

/** React renderer for {@link SlideFanoutNode}. */
export const react = (
  { source, targets }: SlideFanoutNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: fanout } = fanoutModule;
  const { handles: layout } = layoutModule;
  return (
    <div className={cls(context, layout.fill)}>
      <div className={cls(context, fanout.diagram)}>
        <div className={cls(context, fanout.source)}>{source}</div>
        <div aria-hidden className={cls(context, fanout.stem)} />
        <ul className={cls(context, fanout.targets)}>
          {targets.map(({ name, body }, index) => (
            <li key={index} className={cls(context, fanout.target)}>
              <div aria-hidden className={cls(context, fanout.tick)} />
              <div className={cls(context, fanout.label)}>
                <span className={cls(context, fanout.name)}>{name}</span>
                <span className={cls(context, fanout.body)}>{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
