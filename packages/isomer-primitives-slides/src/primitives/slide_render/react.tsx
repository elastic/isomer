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
import { slideLayout } from '../layout';

import { renderScale } from './fit';
import { headline } from './output';
import { RenderPanel } from './panel';
import { renderModule } from './styles';
import type { SlideRenderNode } from './types';

/** React renderer for {@link SlideRenderNode}. */
export const react = (
  node: SlideRenderNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: render } = renderModule;
  const { type, surface } = node;
  const scale = renderScale(node, slideLayout(context));
  return (
    <figure
      {...nodeAnchor(context, { type })}
      className={cls(context, render.root)}>
      <figcaption className={cls(context, render.caption)}>
        {headline(node)}
      </figcaption>
      <RenderPanel
        size={render.fit}
        outputScale={render.outputScale}
        {...{ node, surface, scope, context, scale }}
      />
    </figure>
  );
};
