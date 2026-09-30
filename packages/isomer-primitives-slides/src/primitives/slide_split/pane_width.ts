/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { split } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import type { SlideSplitDivider, SlideSplitRatio } from '../../theme/variants';

const middle: Record<SlideSplitDivider, number> = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

const fr = ({ value }: ScaleToken): number | undefined =>
  value.endsWith('fr') ? parseFloat(value) : undefined;

/** The two panes' widths in pixels when the split spans `total`; a flexible pane the fixed tracks leave no room for is 0, never negative. */
export const paneWidths = (
  total: number,
  ratio: SlideSplitRatio,
  divider: SlideSplitDivider
): [number, number] => {
  const { left, right } = split.ratio[ratio];
  const free = total - 2 * scalePx(split.dividerGap[divider]) - middle[divider];
  const fixed = [left, right].reduce(
    (sum, track) => sum + (fr(track) === undefined ? scalePx(track) : 0),
    0
  );
  const shares = (fr(left) ?? 0) + (fr(right) ?? 0);
  const width = (track: ScaleToken) => {
    const share = fr(track);
    return share === undefined
      ? scalePx(track)
      : Math.max(0, ((free - fixed) * share) / shares);
  };
  return [width(left), width(right)];
};
