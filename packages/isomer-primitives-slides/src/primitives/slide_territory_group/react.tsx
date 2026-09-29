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
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';

import type { SlideTerritoryGroupNode } from './schema';
import { territoryModule } from './styles';

/** React renderer for {@link SlideTerritoryGroupNode}. */
export const react = (
  { type, items }: SlideTerritoryGroupNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: territory } = territoryModule;
  const { handles: label } = labelModule;
  const { handles: tones } = tonesModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, territory.list)}>
        {items.map(({ title, body, tone }, index) => (
          <li
            className={cls(
              context,
              territory.item,
              tone ? tones.tone[tone] : territory.plain
            )}
            key={index}>
            <h2
              className={cls(
                context,
                label.label,
                label.toned,
                territory.title
              )}>
              <ToneCue {...{ tone, context }} />
              {title}
            </h2>
            <p className={cls(context, territory.body)}>
              {marksReact(body, context)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
