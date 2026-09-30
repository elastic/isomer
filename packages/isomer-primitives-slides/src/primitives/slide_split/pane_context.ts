/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideRenderContext } from '../../render/context';
import { withContextFields } from '../../render/context_view';
import { stripMarks } from '../../render/marks';
import { frameContentWidth } from '../../theme/components/frame';
import { split } from '../../theme/components/split';
import { scalePx } from '../../theme/scale';
import type { SlideSplitDivider, SlideSplitRatio } from '../../theme/variants';
import { proseLines } from '../size';
import { crowdingAfter } from '../slide_heading/fit';

import type { SlideSplitNode, SlideSplitPane } from './types';

const middleWidth: Record<SlideSplitDivider, number> = {
  gap: 0,
  rule: scalePx(split.ruleWidth),
  hairline: scalePx(split.hairlineWidth),
  arrow: scalePx(split.arrowWidth),
};

const fr = ({ value }: ScaleToken): number | undefined =>
  value.endsWith('fr') ? parseFloat(value) : undefined;

const lineHeight = ({
  size,
  lineHeight,
}: {
  size: ScaleToken;
  lineHeight: ScaleToken;
}) => scalePx(size) * parseFloat(lineHeight.value);

/** Left and right pane widths of a split `width` px wide. */
export const paneWidths = (
  width: number,
  ratio: SlideSplitRatio,
  divider: SlideSplitDivider
): [number, number] => {
  const { left, right } = split.ratio[ratio];
  const free =
    width - middleWidth[divider] - 2 * scalePx(split.dividerGap[divider]);
  const [leftShare, rightShare] = [fr(left), fr(right)];
  if (leftShare === undefined) {
    return [scalePx(left), free - scalePx(left)];
  }
  if (rightShare === undefined) {
    return [free - scalePx(right), scalePx(right)];
  }
  const total = leftShare + rightShare;
  return [(free * leftShare) / total, (free * rightShare) / total];
};

/** The context a pane's items render in: its own width, and the room its label and the footnote take. */
export const paneContexts = (
  context: SlideRenderContext | undefined,
  { panes, ratio = 'even', divider = 'gap', footnote }: SlideSplitNode
): [SlideRenderContext, SlideRenderContext] => {
  const width = context?.width ?? frameContentWidth;
  const [leftPane, rightPane] = panes;
  const [leftWidth, rightWidth] = paneWidths(width, ratio, divider);
  const footnoteHeight = footnote
    ? scalePx(split.footnoteGap) +
      proseLines(
        stripMarks(footnote),
        scalePx(split.footnote.size),
        Math.min(width, scalePx(split.footnoteMaxWidth))
      ) *
        lineHeight(split.footnote)
    : 0;
  const paneContext = ({ label }: SlideSplitPane, paneWidth: number) =>
    withContextFields(context, {
      width: paneWidth,
      crowding: crowdingAfter(
        context?.crowding ?? 1,
        footnoteHeight +
          (label ? lineHeight(split.label) + scalePx(split.labelGap) : 0)
      ),
    });
  return [paneContext(leftPane, leftWidth), paneContext(rightPane, rightWidth)];
};
