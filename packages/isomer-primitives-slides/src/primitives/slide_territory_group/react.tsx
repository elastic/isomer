/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';

import type { SlideTerritoryGroupNode } from './schema';
import { territoryModule } from './styles';

/** React renderer for {@link SlideTerritoryGroupNode}. */
export const react = (
  { items }: SlideTerritoryGroupNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: territory } = territoryModule;
  const { handles: label } = labelModule;
  const { handles: tones } = tonesModule;
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, territory.list)}>
        {items.map(({ title, body, tone = 'primary' }, index) => (
          <li
            className={cls(context, territory.item, tones.tone[tone])}
            key={index}>
            <h3
              className={cls(
                context,
                label.label,
                label.toned,
                territory.title
              )}>
              {title}
            </h3>
            <p className={cls(context, territory.body)}>{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
