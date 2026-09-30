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
import { scaledWidth } from '../slide_render/fit';
import { headline } from '../slide_render/output';
import { RenderPanel } from '../slide_render/panel';
import { renderModule } from '../slide_render/styles';

import { annotatedScale, legendStep } from './fit';
import { annotatedRenderModule } from './styles';
import type { SlideAnnotatedRenderNode } from './types';

/** React renderer for {@link SlideAnnotatedRenderNode}; it draws its `render` child itself, so pins sit on the panel. */
export const react = (
  { type, render: node, pins }: SlideAnnotatedRenderNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: annotated } = annotatedRenderModule;
  const { handles: render } = renderModule;
  const { surface } = node;
  const layout = slideLayout(context);
  const scale = annotatedScale(node, layout);
  const legend = legendStep(pins, layout);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, annotated.grid)}>
        <figure
          {...nodeAnchor(context, { type: node.type })}
          className={cls(context, annotated.figure)}
          style={{ maxWidth: `${scaledWidth(scale)}px` }}>
          <figcaption className={cls(context, render.caption)}>
            {headline(node)}
          </figcaption>
          <div className={cls(context, annotated.stage)}>
            <RenderPanel
              size={annotated.fit}
              outputScale={render.outputScale}
              {...{ node, surface, scope, context, scale }}
            />
            {pins.map(({ x, y }, index) => (
              <span
                aria-hidden
                className={cls(context, annotated.pin)}
                key={index}
                style={{ left: `${x}%`, top: `${y}%` }}>
                {index + 1}
              </span>
            ))}
          </div>
        </figure>
        <ol className={cls(context, annotated.legend)}>
          {pins.map(({ title, body }, index) => (
            <li
              className={cls(
                context,
                annotated.item,
                annotated.itemStep[legend]
              )}
              key={index}>
              <span aria-hidden className={cls(context, annotated.disc)}>
                {index + 1}
              </span>
              <div className={cls(context, annotated.copy)}>
                <span
                  className={cls(
                    context,
                    annotated.title,
                    annotated.titleStep[legend]
                  )}>
                  {title}
                </span>
                <span
                  className={cls(
                    context,
                    annotated.body,
                    annotated.bodyStep[legend]
                  )}>
                  {marksReact(body, context)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
