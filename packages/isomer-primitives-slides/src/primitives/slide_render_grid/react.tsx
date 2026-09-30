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
import type { RenderGridShape } from '../../theme/components/render_grid';
import { RenderPanel } from '../slide_render/panel';

import { renderGridModule } from './styles';
import type { SlideRenderGridNode } from './types';

const shapeFor = (count: number): RenderGridShape =>
  count <= 2
    ? 'twoByOne'
    : count === 3
      ? 'threeByOne'
      : count === 4
        ? 'twoByTwo'
        : 'threeByTwo';

/** React renderer for {@link SlideRenderGridNode}. */
export const react = (
  node: SlideRenderGridNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { type, tiles } = node;
  const { handles: grid } = renderGridModule;
  const shape = shapeFor(tiles.length);
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
            slideScale={grid.slideScale[shape]}
            outputScale={grid.outputScale}
            {...{ node, surface, scope, context }}
          />
        </figure>
      ))}
    </div>
  );
};
