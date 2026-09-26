/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { columnWidth, frameContentWidth } from '../../theme/components/frame';
import { split, splitStatementMinLoad } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import type { SlideSplitRatio } from '../../theme/variants';

import type { SlideSplitNode, SlideSplitSide } from './types';

const evenWidth = columnWidth([1, 1], split.dividerGap.gap);

/** Each column's width on the canvas, left then right. */
const widths = (ratio: SlideSplitRatio): [number, number] => {
  const { left, right } = split.ratio[ratio];
  if (ratio === 'aside') {
    const notes = scalePx(right);
    return [
      frameContentWidth - notes - 2 * scalePx(split.dividerGap.hairline),
      notes,
    ];
  }
  const shares = [parseFloat(left.value), parseFloat(right.value)];
  return [
    columnWidth(shares, split.dividerGap.gap, 0),
    columnWidth(shares, split.dividerGap.gap, 1),
  ];
};

const sideLoad = ({ items }: SlideSplitSide, width: number): number =>
  (items.reduce<number>(
    (total, item) =>
      typeof item === 'string'
        ? total + Math.max(stripMarks(item).length, splitStatementMinLoad)
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
}: Pick<SlideSplitNode, 'left' | 'right' | 'ratio'>): number => {
  const [leftWidth, rightWidth] = widths(ratio);
  return Math.max(sideLoad(left, leftWidth), sideLoad(right, rightWidth));
};
