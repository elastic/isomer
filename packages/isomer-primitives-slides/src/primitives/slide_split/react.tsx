/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';

import type { SlideSplitNode } from './types';

/** React renderer for {@link SlideSplitNode}. */
export const react = (
  node: SlideSplitNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: split } = slideModules.split;
  return (
    <div
      className={cls(context, split.root, split.ratio[node.ratio ?? 'even'])}>
      <div className={cls(context, split.col)}>
        {node.left.map((child, index) => (
          <Fragment key={index}>{scope.renderReact(child, context)}</Fragment>
        ))}
      </div>
      <div className={cls(context, split.col)}>
        {node.right.map((child, index) => (
          <Fragment key={index}>{scope.renderReact(child, context)}</Fragment>
        ))}
      </div>
    </div>
  );
};
