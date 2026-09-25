/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';

import { stackModule } from './styles';
import type { SlideStackNode } from './types';

/** React renderer for {@link SlideStackNode}. */
export const react = (
  { items, spacing = 'normal' }: SlideStackNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: stack } = stackModule;
  return (
    <div className={cls(context, stack.root, stack.spacing[spacing])}>
      {items.map((child, index) => (
        <Fragment key={index}>{scope.renderReact(child, context)}</Fragment>
      ))}
    </div>
  );
};
