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
import { RenderPanel } from '../slide_render/panel';

import { fillsCell, shapeFor, tileScale } from './fit';
import { renderGridModule } from './styles';
import type { SlideRenderGridNode } from './types';

/** React renderer for {@link SlideRenderGridNode}. */
export const react = (
  node: SlideRenderGridNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { type, tiles } = node;
  const { handles: grid } = renderGridModule;
  const shape = shapeFor(tiles.length);
  const scale = tileScale(node, slideLayout(context));
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, grid.root, grid.shape[shape])}>
      {tiles.map(({ surface, caption }) => (
        <figure className={cls(context, grid.cell)} key={surface}>
          <figcaption className={cls(context, grid.head)}>
            <span className={cls(context, grid.name)}>{surface}</span>
            <span className={cls(context, grid.caption)}>{caption}</span>
          </figcaption>
          <RenderPanel
            size={grid.panel[shape]}
            outputScale={grid.outputScale}
            fill={fillsCell(shape)}
            {...{ node, surface, scope, context, scale }}
          />
        </figure>
      ))}
    </div>
  );
};
