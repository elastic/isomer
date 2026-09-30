/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideLayout } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { tone as toneTheme } from '../../theme/components/shared';
import { split } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import type { SlideSplitDivider, SlideSplitRatio } from '../../theme/variants';
import { lineBox, proseLines, wrappedLines } from '../size';

import type { SlideSplitNode, SlideSplitPane } from './types';

const middle: Record<SlideSplitDivider, number> = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

const fr = ({ value }: ScaleToken): number | undefined =>
  value.endsWith('fr') ? parseFloat(value) : undefined;

/** The two panes' widths in pixels when the split spans `total`, never negative; a fixed track takes no more than the split has. */
export const paneWidths = (
  total: number,
  ratio: SlideSplitRatio,
  divider: SlideSplitDivider
): [number, number] => {
  const { left, right } = split.ratio[ratio];
  const free = Math.max(
    0,
    total - 2 * scalePx(split.dividerGap[divider]) - middle[divider]
  );
  const fixedWidth = (track: ScaleToken) => Math.min(free, scalePx(track));
  const fixed = [left, right].reduce(
    (sum, track) => sum + (fr(track) === undefined ? fixedWidth(track) : 0),
    0
  );
  const shares = (fr(left) ?? 0) + (fr(right) ?? 0);
  const width = (track: ScaleToken) => {
    const share = fr(track);
    return share === undefined
      ? fixedWidth(track)
      : Math.max(0, ((free - fixed) * share) / shares);
  };
  return [width(left), width(right)];
};

const cueWidth = scalePx(toneTheme.cue.size) + scalePx(toneTheme.cue.gap);

const labelHeight = ({ label, tone }: SlideSplitPane, width: number): number =>
  label
    ? wrappedLines(
        label.toUpperCase(),
        scalePx(split.label.size),
        Math.max(1, width - (tone ? cueWidth : 0)),
        split.label.tracking
      ) *
        lineBox(split.label) +
      scalePx(split.labelGap)
    : 0;

/** The layout each pane's items get inside `layout`: the pane's width, and the height its label, wrapped at that width, and the split's footnote leave. */
export const paneLayouts = (
  { width, height }: SlideLayout,
  { panes, ratio = 'even', divider = 'gap', footnote }: SlideSplitNode
): [SlideLayout, SlideLayout] => {
  const footnoteHeight = footnote
    ? scalePx(split.footnoteGap) +
      proseLines(
        stripMarks(footnote),
        scalePx(split.footnote.size),
        Math.min(width, scalePx(split.footnoteMaxWidth))
      ) *
        lineBox(split.footnote)
    : 0;
  const widths = paneWidths(width, ratio, divider);
  const pane = (fields: SlideSplitPane, index: 0 | 1): SlideLayout => ({
    width: widths[index],
    height: Math.max(
      0,
      height - footnoteHeight - labelHeight(fields, widths[index])
    ),
  });
  return [pane(panes[0], 0), pane(panes[1], 1)];
};
