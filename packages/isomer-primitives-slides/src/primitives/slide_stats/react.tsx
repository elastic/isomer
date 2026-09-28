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
import { frameContentWidth } from '../../theme/components/frame';
import { stats as theme } from '../../theme/components/stats';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, placeholderModule } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { emWidth, sizeForWidth } from '../size';

import type { SlideStatsNode } from './schema';
import { statsModule } from './styles';

const { placeholderCaption } = slideDistillery.tokens.stats;

/** The step at which every value, beside its unit, fits its column. */
export const statsValueSize = ({ items, size }: SlideStatsNode): SlideSize => {
  const gutters = (items.length - 1) * 2 * scalePx(theme.columnPadding);
  const column = (frameContentWidth - gutters) / items.length;
  const steps = items.map(({ value = '', unit }) =>
    sizeForWidth(
      size,
      emWidth(value, theme.value.tracking),
      column -
        (unit
          ? emWidth(unit, theme.unit.tracking) * scalePx(theme.unit.size) +
            scalePx(theme.unitGap)
          : 0),
      theme.valueSizes
    )
  );
  return steps.reduce<SlideSize>(
    (worst, step) =>
      slideSizes.indexOf(step) > slideSizes.indexOf(worst) ? step : worst,
    'l'
  );
};

/** React renderer for {@link SlideStatsNode}. */
export const react = (
  node: SlideStatsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items } = node;
  const { handles: stats } = statsModule;
  const valueSize = stats.valueSize[statsValueSize(node)];
  const { handles: placeholder } = placeholderModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ul className={cls(context, stats.list)}>
        {items.map(({ value, unit, label, body }, index) => (
          <li
            className={cls(
              context,
              stats.item,
              index > 0 ? stats.ruled : undefined,
              index < items.length - 1 ? stats.gutter : undefined
            )}
            key={index}>
            {value ? (
              <div className={cls(context, stats.value, valueSize)}>
                <span>{value}</span>
                {unit ? (
                  <span className={cls(context, stats.unit)}>{unit}</span>
                ) : null}
              </div>
            ) : (
              <div
                className={cls(context, placeholder.root, stats.placeholder)}>
                <span className={cls(context, placeholder.caption)}>
                  {placeholderCaption.value}
                </span>
              </div>
            )}
            <h3 className={cls(context, stats.label)}>{label}</h3>
            <p className={cls(context, stats.body)}>
              {marksReact(body, context)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
