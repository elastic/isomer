/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideRenderContext } from '../../render/context';
import { lanes as theme } from '../../theme/components/lanes';
import { tone as toneCue } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  brokenLines,
  codeGrowth,
  markedLines,
  monoWidth,
  trackWidth,
} from '../size';

import type { SlideLanesLane, SlideLanesNode } from './schema';

const { chip, join, notes } = theme;

const lineHeight = (
  size: ScaleToken,
  { lineHeight }: { lineHeight: ScaleToken }
) => scalePx(size) * parseFloat(lineHeight.value);

/** The width the widest lane takes at `step`: its label column, chips and their shortest lines, the bracket, and the join. */
export const lanesWidth = (
  { lanes, join: joinText }: Pick<SlideLanesNode, 'lanes' | 'join'>,
  step: SlideSize
): number =>
  scalePx(theme.labelColumns[step]) +
  Math.max(
    ...lanes.map(({ steps }) =>
      steps.reduce(
        (total, text) =>
          total +
          monoWidth(text, theme.chipSizes[step]) +
          2 * (scalePx(chip.paddingX[step]) + scalePx(chip.border)) +
          scalePx(theme.lineMins[step]),
        0
      )
    )
  ) +
  scalePx(theme.bracketColumns[step]) +
  monoWidth(joinText, theme.joinSizes[step]) +
  2 * scalePx(join.paddingX[step]);

/** The height a lane's name takes in capitals at `step`, wrapped in its column. */
const labelHeight = (
  { label, tone }: SlideLanesLane,
  step: SlideSize
): number => {
  const column =
    scalePx(theme.labelColumns[step]) -
    (tone ? scalePx(toneCue.cue.size) + scalePx(toneCue.cue.gap) : 0);
  return (
    brokenLines(
      label.toUpperCase(),
      scalePx(theme.labelSizes[step]),
      column,
      theme.label.tracking
    ) * lineHeight(theme.labelSizes[step], theme.label)
  );
};

/** The height the lanes and their notes take at `step` across `width`. */
export const lanesHeight = (
  { lanes, notes: items = [] }: Pick<SlideLanesNode, 'lanes' | 'notes'>,
  step: SlideSize,
  width: number
): number => {
  const rows =
    lanes.reduce(
      (total, lane) =>
        total +
        Math.max(scalePx(theme.rowHeights[step]), labelHeight(lane, step)),
      0
    ) + scalePx(theme.rowGaps[step]);
  if (items.length === 0) {
    return rows;
  }
  const column = trackWidth(
    width - scalePx(theme.labelColumns[step]),
    [1, 1],
    notes.columnGaps[step]
  );
  const noteHeight = ({ title, body }: { title: string; body: string }) => {
    const lines = markedLines(body, scalePx(notes.bodySizes[step]), column);
    return (
      brokenLines(
        title,
        scalePx(notes.titleSizes[step]),
        column,
        notes.title.tracking
      ) *
        lineHeight(notes.titleSizes[step], notes.title) +
      scalePx(notes.itemGap) +
      lines * lineHeight(notes.bodySizes[step], notes.body) +
      codeGrowth(body, lines)
    );
  };
  const noteRows = Array.from(
    { length: Math.ceil(items.length / 2) },
    (_, row) => Math.max(...items.slice(2 * row, 2 * row + 2).map(noteHeight))
  );
  return (
    rows +
    scalePx(notes.gaps[step]) +
    noteRows.reduce((total, height) => total + height, 0) +
    scalePx(notes.rowGaps[step]) * (noteRows.length - 1)
  );
};

/** The node's own `size`, else the largest step at which it fits its layout across and down; `s` when none does. */
export const lanesStep = (
  node: SlideLanesNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const { width, height } = slideLayout(context);
  return (
    node.size ??
    slideSizes.find(
      (step) =>
        lanesWidth(node, step) <= width &&
        lanesHeight(node, step, width) <= height
    ) ??
    's'
  );
};
