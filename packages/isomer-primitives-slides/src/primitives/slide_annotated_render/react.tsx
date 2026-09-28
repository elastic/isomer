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
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, placeholderModule } from '../../theme/modules';
import { embeddedLabel } from '../slide_render/embedded';
import { RenderPanel } from '../slide_render/panel';
import { renderModule } from '../slide_render/styles';

import { legendStep, renderStep } from './fit';
import { annotatedRenderModule } from './styles';
import type { SlideAnnotatedRenderNode } from './types';

const { separator } = slideDistillery.tokens.render;

/** React renderer for {@link SlideAnnotatedRenderNode}. */
export const react = (
  { type, render: node, pins }: SlideAnnotatedRenderNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: annotated } = annotatedRenderModule;
  const { handles: render } = renderModule;
  const { handles: placeholder } = placeholderModule;
  const { type: renderType, composition, surface, caption } = node;
  const step = renderStep(caption !== undefined, context?.crowding);
  const legend = legendStep(pins, context?.crowding);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, annotated.grid)}>
        <figure
          {...nodeAnchor(context, { type: renderType })}
          className={cls(
            context,
            annotated.figure,
            annotated.figureSize[step]
          )}>
          {caption ? (
            <figcaption className={cls(context, render.caption)}>
              {caption}
            </figcaption>
          ) : null}
          <div className={cls(context, annotated.stage)}>
            {composition ? (
              <RenderPanel
                body={composition.body}
                size={annotated.fit}
                slideScale={annotated.slideScale[step]}
                outputScale={render.outputScale}
                {...{ surface, scope, context }}
              />
            ) : (
              <div className={cls(context, placeholder.root, annotated.fit)}>
                <span className={cls(context, placeholder.caption)}>
                  {`${embeddedLabel(node)} ${separator.value} ${surface}`}
                </span>
              </div>
            )}
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
                  {marksReact(title, context, 'primary')}
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
