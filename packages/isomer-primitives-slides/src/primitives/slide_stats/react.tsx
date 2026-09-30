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
import { stats as theme } from '../../theme/components/stats';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, placeholderModule } from '../../theme/modules';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { emWidth, sizeForWidth, smallerStep } from '../size';

import type { SlideStatsNode } from './schema';
import { statsModule } from './styles';

const { caption } = slideDistillery.tokens.placeholder;

/** The step at which every value, beside its unit, fits its column of `width`. */
export const statsValueSize = (
  { items, size }: SlideStatsNode,
  width: number
): SlideSize => {
  const gutters =
    (items.length - 1) *
    (2 * scalePx(theme.columnPadding) + scalePx(theme.rule));
  const column = (width - gutters) / items.length;
  return items.reduce<SlideSize>((worst, { value = '', unit }) => {
    const step = sizeForWidth(
      size,
      emWidth(value, theme.value.tracking),
      column -
        (unit
          ? emWidth(unit, theme.unit.tracking) * scalePx(theme.unit.size) +
            scalePx(theme.unitGap)
          : 0),
      theme.valueSizes
    );
    return smallerStep(worst, step);
  }, 'l');
};

/** React renderer for {@link SlideStatsNode}. */
export const react = (
  node: SlideStatsNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, items } = node;
  const { handles: stats } = statsModule;
  const { handles: placeholder } = placeholderModule;
  const step = statsValueSize(node, slideLayout(context).width);
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
              <div className={cls(context, stats.value, stats.valueSize[step])}>
                <span>{value}</span>
                {unit ? (
                  <>
                    {' '}
                    <span className={cls(context, stats.unit)}>{unit}</span>
                  </>
                ) : null}
              </div>
            ) : (
              <div
                className={cls(
                  context,
                  placeholder.root,
                  stats.placeholder,
                  stats.placeholderHeight[step]
                )}>
                <span className={cls(context, placeholder.caption)}>
                  {caption.value}
                </span>
              </div>
            )}
            <p className={cls(context, stats.label)}>{label}</p>
            <p className={cls(context, stats.body)}>
              {marksReact(body, context)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
