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
import { slideDistillery } from '../../theme/distillery';
import {
  connectorModule,
  layoutModule,
  placeholderModule,
} from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { slideLayout } from '../layout';
import { emWidth, sizeForWidth } from '../size';

import type { SlideDeltaNode, SlideDeltaPoint } from './schema';
import { deltaModule } from './styles';

const { connector, placeholder: pending } = slideDistillery.tokens;

/** Width each value may take of `width` once the arrow, gaps, and the note's floor are set aside. */
const valueWidth = (width: number): number =>
  (width -
    scalePx(theme.arrowWidth) -
    3 * scalePx(theme.columnGap) -
    scalePx(theme.noteMinWidth)) /
  2;

/** The one step at which both values fit across `width`, so they read as a pair. */
export const deltaValueSize = (
  { before, after, size }: SlideDeltaNode,
  width: number
): SlideSize =>
  [before, after].reduce<SlideSize>((worst, { value = '' }) => {
    const step = sizeForWidth(
      size,
      emWidth(value, theme.value.tracking),
      valueWidth(width),
      theme.valueSizes
    );
    return slideSizes.indexOf(step) > slideSizes.indexOf(worst) ? step : worst;
  }, 'l');

const Side = ({
  point: { label, value },
  step,
  after = false,
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
            {pending.caption.value}
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
  const { handles: arrow } = connectorModule;
  const step = deltaValueSize(node, slideLayout(context).width);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, delta.root)}>
        <Side point={before} {...{ step, context }} />
        <div
          role="img"
          aria-label={connector.label.value}
          className={cls(context, arrow.across, delta.arrowLift[step])}>
          <div className={cls(context, arrow.railAcross)} />
          <div className={cls(context, arrow.headRight)} />
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
