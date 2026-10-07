/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import type { StyleHandle } from '@elastic/distillate';
import { type PrimitiveNode, withoutAnchors } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type {
  SlideRenderContext,
  SlideRenderScope,
} from '../../render/context';
import { withContextFields } from '../../render/context_view';
import type { SlideRenderSurface } from '../../theme/variants';
import { frameBodyLayout, withLayout } from '../layout';

import { scaledHeight, scaledWidth } from './fit';
import { isDrawn, outputLines, renderLabel } from './output';
import { renderModule } from './styles';

interface PanelProps {
  node: { slide?: string; body?: readonly PrimitiveNode[] };
  surface: SlideRenderSurface;
  scope: SlideRenderScope;
  context: SlideRenderContext | undefined;
  /** Gives the panel its shape in the parent's layout. */
  size: StyleHandle;
  /** Of the whole slide; the panel is as wide as the slide at this scale. */
  scale: number;
  /** Stretch to the cell instead, no shorter than the slide at `scale`. */
  fill?: boolean;
  outputScale: StyleHandle;
}

/**
 * An embedded body on one surface: drawn surfaces show the slide at full size scaled by `scale`, the rest print their output. With no body, a placeholder names the reference.
 *
 * An embedded slide lays out as it would alone, on a fresh full-slide layout, whatever the host slide around it sets; only the drawn result is scaled. Its top-level nodes show as `surface` shows them, so a `snapshot` panel follows each node's `snapshot` visibility.
 */
export const RenderPanel = ({
  node: { slide, body },
  surface,
  scope,
  context,
  size,
  scale,
  fill = false,
  outputScale,
}: PanelProps): ReactNode => {
  const { handles: render } = renderModule;
  const style = fill
    ? { minHeight: `${scaledHeight(scale)}px` }
    : { width: `${scaledWidth(scale)}px` };
  if (!body) {
    return (
      <div className={cls(context, render.placeholder, size)} style={style}>
        <span className={cls(context, render.placeholderCaption)}>
          {renderLabel({ slide, surface })}
        </span>
      </div>
    );
  }
  const [first] = body;
  const bare = body.length !== 1 || first?.type !== 'slideFrame';
  const drawnOn = surface === 'snapshot' ? 'snapshot' : 'react';
  const embedded = withContextFields(withoutAnchors(context), {
    layout: undefined,
    logo: undefined,
  });
  return (
    <div className={cls(context, render.panel, size)} style={style}>
      {isDrawn(surface) ? (
        <div
          className={cls(context, render.slide, bare ? render.bare : undefined)}
          style={{ transform: `scale(${scale})` }}>
          {body.map((child, index) => (
            <Fragment key={index}>
              {scope.renderOn(drawnOn, child, {
                context: bare
                  ? withLayout(embedded, frameBodyLayout(body, index, drawnOn))
                  : embedded,
              })}
            </Fragment>
          ))}
        </div>
      ) : (
        <div className={cls(context, render.output, outputScale)}>
          {outputLines(surface, body, scope).map((line, index) => (
            <div className={cls(context, render.line)} key={index}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
