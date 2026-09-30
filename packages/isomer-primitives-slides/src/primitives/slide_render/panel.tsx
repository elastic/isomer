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

import { isDrawn, outputLines, renderLabel } from './output';
import { renderModule } from './styles';

interface PanelProps {
  node: { slide?: string; body?: readonly PrimitiveNode[] };
  surface: SlideRenderSurface;
  scope: SlideRenderScope;
  context: SlideRenderContext | undefined;
  /** Gives the panel its size in the parent's layout. */
  size: StyleHandle;
  slideScale: StyleHandle;
  outputScale: StyleHandle;
}

/**
 * An embedded body on one surface: drawn surfaces show the slide at full size scaled by `slideScale`, the rest print their output. With no body, a placeholder names the reference.
 */
export const RenderPanel = ({
  node: { slide, body },
  surface,
  scope,
  context,
  size,
  slideScale,
  outputScale,
}: PanelProps): ReactNode => {
  const { handles: render } = renderModule;
  if (!body) {
    return (
      <div className={cls(context, render.placeholder, size)}>
        <span className={cls(context, render.placeholderCaption)}>
          {renderLabel({ slide, surface })}
        </span>
      </div>
    );
  }
  const [first] = body;
  const bare = body.length !== 1 || first?.type !== 'slideFrame';
  // An embedded slide lays out as it would alone, whatever the host slide around it sets.
  const embedded = withContextFields(withoutAnchors(context), {
    crowding: undefined,
    logo: undefined,
  });
  return (
    <div className={cls(context, render.panel, size)}>
      {isDrawn(surface) ? (
        <div
          className={cls(
            context,
            render.slide,
            bare ? render.bare : undefined,
            slideScale
          )}>
          {body.map((child, index) => (
            <Fragment key={index}>
              {scope.renderReact(child, embedded)}
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
