/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';

import type { SlideTerritoryGroupNode } from './schema';

/** React renderer for {@link SlideTerritoryGroupNode}. */
export const react = (
  node: SlideTerritoryGroupNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: territory } = slideModules.territory;
  const { handles: tones } = slideModules.tones;
  return (
    <div className={cls(context, territory.grid)}>
      {node.items.map((item, index) => (
        <div
          className={cls(
            context,
            territory.item,
            tones.tone[item.tone ?? 'primary']
          )}
          key={`${item.title}-${index}`}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
};
