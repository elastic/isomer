/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideDistillery } from '../../theme/distillery';
import { placeholderModule } from '../../theme/modules';

import type { SlideStatNode } from './schema';
import { statModule } from './styles';

const { placeholderCaption } = slideDistillery.tokens.stat;

/** React renderer for {@link SlideStatNode}. */
export const react = (
  { value, unit, body }: SlideStatNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: stat } = statModule;
  const { handles: placeholder } = placeholderModule;
  return (
    <div className={cls(context, stat.root)}>
      {value ? (
        <span className={cls(context, stat.value)}>
          {[value, unit].filter(Boolean).join(' ')}
        </span>
      ) : (
        <div className={cls(context, placeholder.root, stat.placeholder)}>
          <span className={cls(context, placeholder.caption)}>
            {placeholderCaption.value}
          </span>
        </div>
      )}
      <p className={cls(context, stat.body)}>{body}</p>
    </div>
  );
};
