/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stats as theme } from '../../theme/components/stats';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { measureText, sizeForWidth, smallerStep } from '../size';

import type { SlideStatsNode } from './schema';

/** The node's own `size`, else the step at which every value, beside its unit, fits its column of the layout. */
export const statsStep = (
  { items, size }: Pick<SlideStatsNode, 'items' | 'size'>,
  { width }: Pick<StepLayout, 'width'>
): SlideSize => {
  const gutters =
    (items.length - 1) *
    (2 * scalePx(theme.columnPadding) + scalePx(theme.rule));
  const column = (width - gutters) / items.length;
  return items.reduce<SlideSize>((worst, { value = '', unit }) => {
    const step = sizeForWidth(
      size,
      value,
      theme.value,
      column -
        (unit
          ? measureText(unit, theme.unit).widest + scalePx(theme.unitGap)
          : 0),
      theme.valueSizes
    );
    return smallerStep(worst, step);
  }, 'l');
};
