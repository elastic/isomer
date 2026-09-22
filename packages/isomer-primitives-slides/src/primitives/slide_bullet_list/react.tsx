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

import type { SlideBulletListNode } from './schema';

/** React renderer for {@link SlideBulletListNode}. */
export const react = (
  node: SlideBulletListNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: bullets } = slideModules.bullets;
  const { handles: label } = slideModules.label;
  return (
    <div
      className={cls(
        context,
        bullets.root,
        bullets.marker[node.marker ?? 'dot']
      )}>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <ul>
        {node.items.map((item, index) => (
          <li key={`${item}-${index}`}>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
