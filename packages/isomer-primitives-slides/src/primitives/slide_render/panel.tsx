/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import type { StyleHandle } from '@elastic/distillate';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { renderChildren, renderSlackChildren } from '../../render/children';
import { cls } from '../../render/cls';
import type {
  SlideRenderContext,
  SlideRenderScope,
} from '../../render/context';
import { slideDistillery } from '../../theme/distillery';
import type { SlideRenderSurface } from '../../theme/variants';

import { renderModule } from './styles';

const typeColumn = Number(slideDistillery.tokens.render.slackTypeColumn.value);

const textsIn = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(textsIn);
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    (key === 'text' || key === 'alt_text') && typeof child === 'string'
      ? [child]
      : textsIn(child)
  );
};

/** Slack blocks as one line each: the block type, padded, then its text on one line. */
export const slackLines = (blocks: readonly SlackBlock[]): string[] =>
  blocks.map(({ type, ...rest }) =>
    `${type.padEnd(typeColumn)}${textsIn(rest).join(' ').replace(/\s+/g, ' ').trim()}`.trimEnd()
  );

/** What `surface` outputs for `body`, one entry per non-blank line. */
export const outputLines = (
  surface: Exclude<SlideRenderSurface, 'react' | 'html' | 'svg'>,
  body: readonly PrimitiveNode[],
  scope: SlideRenderScope
): string[] =>
  (surface === 'slack'
    ? slackLines(renderSlackChildren(body, scope, undefined))
    : renderChildren(body, scope, surface).split('\n')
  ).filter((line) => line.trim() !== '');

const isVisual = (
  surface: SlideRenderSurface
): surface is 'react' | 'html' | 'svg' =>
  surface === 'react' || surface === 'html' || surface === 'svg';

/**
 * A composition's body on one surface, inside a panel.
 *
 * Web and image surfaces draw the body at full slide size, scaled by `slideScale`;
 * the rest print their output at the scale `outputScale` sets.
 */
export const RenderPanel = ({
  body,
  surface,
  scope,
  context,
  size,
  slideScale,
  outputScale,
}: {
  body: readonly PrimitiveNode[];
  surface: SlideRenderSurface;
  scope: SlideRenderScope;
  context: SlideRenderContext | undefined;
  /** Gives the panel its size in the parent's layout. */
  size: StyleHandle;
  slideScale: StyleHandle;
  outputScale: StyleHandle;
}): ReactNode => {
  const { handles: render } = renderModule;
  const [first] = body;
  const bare = body.length !== 1 || first?.type !== 'slideFrame';
  return (
    <div className={cls(context, render.panel, size)}>
      {isVisual(surface) ? (
        <div
          className={cls(
            context,
            render.slide,
            bare ? render.bare : undefined,
            slideScale
          )}>
          {body.map((node, index) => (
            <Fragment key={index}>{scope.renderReact(node, context)}</Fragment>
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
