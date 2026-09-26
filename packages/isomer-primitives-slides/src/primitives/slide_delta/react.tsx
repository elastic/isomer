/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact } from '../../render/marks';
import { delta as theme } from '../../theme/components/delta';
import { frameContentWidth } from '../../theme/components/frame';
import {
  connectorModule,
  layoutModule,
  placeholderModule,
} from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { emWidth, sizeForWidth } from '../size';

import type { SlideDeltaNode, SlideDeltaPoint } from './schema';
import { deltaModule } from './styles';

/** Width each value may take once the arrow, the gaps, and the note's floor are set aside. */
const valueWidth =
  (frameContentWidth -
    scalePx(theme.arrowWidth) -
    3 * scalePx(theme.columnGap) -
    scalePx(theme.noteMinWidth)) /
  2;

/** The one step at which both values fit, so they read as a pair. */
export const deltaValueSize = ({
  before,
  after,
  size,
}: SlideDeltaNode): SlideSize =>
  [before, after].reduce<SlideSize>((worst, { value = '' }) => {
    const step = sizeForWidth(
      size,
      emWidth(value, theme.value.tracking),
      valueWidth,
      theme.valueSizes
    );
    return slideSizes.indexOf(step) > slideSizes.indexOf(worst) ? step : worst;
  }, 'l');

const Side = ({
  point: { label, value },
  step,
  after,
  context,
}: {
  point: SlideDeltaPoint;
  step: SlideSize;
  after?: boolean;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: delta } = deltaModule;
  const { handles: placeholder } = placeholderModule;
  return (
    <div className={cls(context, delta.side)}>
      <span
        className={cls(
          context,
          delta.label,
          after ? delta.labelAfter : undefined
        )}>
        {marksReact(label, context, 'primary')}
      </span>
      {value ? (
        <span
          className={cls(
            context,
            delta.value,
            delta.valueSize[step],
            after ? delta.valueAfter : undefined
          )}>
          {value}
        </span>
      ) : (
        <div
          className={cls(
            context,
            placeholder.root,
            delta.placeholder,
            delta.placeholderHeight[step]
          )}>
          <span className={cls(context, placeholder.caption)}>
            {theme.placeholderCaption.value}
          </span>
        </div>
      )}
    </div>
  );
};

/** React renderer for {@link SlideDeltaNode}. */
export const react = (
  node: SlideDeltaNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, before, after, change, body } = node;
  const { handles: delta } = deltaModule;
  const { handles: connector } = connectorModule;
  const step = deltaValueSize(node);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, delta.root)}>
        <Side point={before} {...{ step, context }} />
        <div
          aria-hidden
          className={cls(context, connector.across, delta.arrowLift[step])}>
          <div className={cls(context, connector.railAcross)} />
          <div className={cls(context, connector.headRight)} />
        </div>
        <Side point={after} after {...{ step, context }} />
        <div className={cls(context, delta.note)}>
          {change ? (
            <span className={cls(context, delta.change)}>{change}</span>
          ) : null}
          <p className={cls(context, delta.body)}>
            {marksReact(body, context)}
          </p>
        </div>
      </div>
    </div>
  );
};
