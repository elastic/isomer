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
import { layoutModule } from '../../theme/modules';

import type { SlideTreeNode } from './schema';
import { treeModule } from './styles';

/** React renderer for {@link SlideTreeNode}. */
export const react = (
  { type, root, entries }: SlideTreeNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: tree } = treeModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, tree.root)}>
        <div className={cls(context, tree.folder)}>{root}</div>
        <ul className={cls(context, tree.entries)}>
          {entries.map(({ name, body }, index) => {
            const last = index === entries.length - 1;
            return (
              <li className={cls(context, tree.row)} key={index}>
                {last ? null : <span className={cls(context, tree.rail)} />}
                <span className={cls(context, tree.name)}>
                  {last ? (
                    <span className={cls(context, tree.railLast)} />
                  ) : null}
                  <span className={cls(context, tree.tick)} />
                  <span>{name}</span>
                </span>
                <span className={cls(context, tree.body)}>{body}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
