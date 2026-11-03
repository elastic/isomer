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
import { slideDistillery } from '../../theme/distillery';
import {
  connectorModule,
  layoutModule,
  placeholderModule,
} from '../../theme/modules';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';

import { deltaStep } from './fit';
import type { SlideDeltaNode, SlideDeltaPoint } from './schema';
import { deltaModule } from './styles';

const { connector, placeholder: pending } = slideDistillery.tokens;

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
  const step = deltaStep(node, slideLayout(context));
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, delta.root)}>
        <Side point={before} {...{ step, context }} />
        <div
          role="img"
          aria-label={connector.label.value}
          className={cls(
            context,
            arrow.across,
            delta.arrow,
            delta.arrowLift[step]
          )}>
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
