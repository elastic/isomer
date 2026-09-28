/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { frameContentWidth } from '../../theme/components/frame';
import { split, splitStatementMinLoad } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import type { SlideSplitDivider, SlideSplitRatio } from '../../theme/variants';

import type { SlideSplitNode, SlideSplitSide } from './types';

/** Width of each divider's middle track; `gap` draws none. */
const trackWidth: Record<SlideSplitDivider, number> = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

/** Each column's width on the canvas, left then right: the divider's gap sits either side of its track. */
const widths = (
  ratio: SlideSplitRatio,
  divider: SlideSplitDivider
): [number, number] => {
  const free =
    frameContentWidth -
    2 * scalePx(split.dividerGap[divider]) -
    trackWidth[divider];
  const { left, right } = split.ratio[ratio];
  if (ratio === 'aside') {
    const notes = scalePx(right);
    return [free - notes, notes];
  }
  const [leftShare, rightShare] = [
    parseFloat(left.value),
    parseFloat(right.value),
  ];
  const total = leftShare + rightShare;
  return [(free * leftShare) / total, (free * rightShare) / total];
};

const [evenWidth] = widths('even', 'gap');

const sideLoad = ({ items }: SlideSplitSide, width: number): number =>
  (items.reduce<number>(
    (total, item) =>
      typeof item === 'string'
        ? total +
          Math.max(displayColumns(stripMarks(item)), splitStatementMinLoad)
        : total,
    0
  ) *
    evenWidth) /
  width;

/** The statement load of a split's busier column, scaled to an even column's width. */
export const splitLoad = ({
  left,
  right,
  ratio = 'even',
  divider = 'gap',
}: Pick<SlideSplitNode, 'left' | 'right' | 'ratio' | 'divider'>): number => {
  const [leftWidth, rightWidth] = widths(ratio, divider);
  return Math.max(sideLoad(left, leftWidth), sideLoad(right, rightWidth));
};
