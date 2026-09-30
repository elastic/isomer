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
import { marksReact, stripMarks } from '../../render/marks';
import {
  statement as theme,
  statementFit,
} from '../../theme/components/statement';
import { layoutModule } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import { slideLayout } from '../layout';
import { narrowing, sizeForLoad, textColumns } from '../size';

import type { SlideStatementNode } from './schema';
import { statementModule } from './styles';

/** React renderer for {@link SlideStatementNode}. */
export const react = (
  { type, text, size }: SlideStatementNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: statement } = statementModule;
  const { width, crowding } = slideLayout(context);
  const step = sizeForLoad(
    size,
    textColumns(stripMarks(text)) * narrowing(scalePx(theme.maxWidth), width),
    statementFit,
    crowding
  );
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
