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

import { headingStep } from './fit';
import type { SlideHeadingNode } from './schema';
import { headingModule } from './styles';

/** React renderer for {@link SlideHeadingNode}. */
export const react = (
  node: SlideHeadingNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, title, lede } = node;
  const { handles: heading } = headingModule;
  return (
    <header
      {...nodeAnchor(context, { type })}
      className={cls(context, heading.root)}>
      <h1
        className={cls(
          context,
          heading.title,
          heading.titleSize[headingStep(node)]
        )}>
        {marksReact(title, context, 'primary')}
      </h1>
      {lede ? (
        <p className={cls(context, heading.lede)}>
          {marksReact(lede, context)}
        </p>
      ) : null}
    </header>
  );
};
