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
import { layoutModule } from '../../theme/modules';
import { slideLayout } from '../layout';

import { statementStep } from './fit';
import type { StatementSlideNode } from './schema';
import { statementModule } from './styles';

/** React renderer for {@link StatementSlideNode}. */
export const react = (
  node: StatementSlideNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: statement } = statementModule;
  const { type, text } = node;
  const step = statementStep(node, slideLayout(context));
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <h1 className={cls(context, statement.text, statement.textSize[step])}>
        {marksReact(text, context, 'primary')}
      </h1>
    </div>
  );
};
