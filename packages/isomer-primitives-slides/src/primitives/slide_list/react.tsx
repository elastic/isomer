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
import { labelModule, layoutModule } from '../../theme/modules';

import type { SlideListNode } from './schema';
import { listModule } from './styles';

/** React renderer for {@link SlideListNode}. */
export const react = (
  { type, label, items, footnote }: SlideListNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: list } = listModule;
  const plain = items.every(({ term }) => term === undefined);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, list.root)}>
        {label ? (
          <div className={cls(context, labelModule.handles.label, list.label)}>
            {label}
          </div>
        ) : null}
        {plain ? (
          <ul className={cls(context, list.plainRows)}>
            {items.map(({ body }, index) => (
              <li className={cls(context, list.plainRow)} key={index}>
                {marksReact(body, context)}
              </li>
            ))}
          </ul>
        ) : (
          <ul className={cls(context, list.rows)}>
            {items.map(({ term, body }, index) => (
              <li className={cls(context, list.row)} key={index}>
                {term ? (
                  <>
                    <span className={cls(context, list.term)}>{term}</span>{' '}
                  </>
                ) : null}
                <span
                  className={cls(
                    context,
                    list.body,
                    term ? undefined : list.wide
                  )}>
                  {marksReact(body, context)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {footnote ? (
          <p className={cls(context, list.footnote)}>
            {marksReact(footnote, context)}
          </p>
        ) : null}
      </div>
    </div>
  );
};
