/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { delta as theme } from '../../theme/components/delta';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { measureMarks, measureText, stepWhere } from '../size';

import type { SlideDeltaNode, SlideDeltaPoint } from './schema';

/** A side's width at `step`: its value, or its placeholder, and never less than its label. */
const sideWidth = ({ label, value }: SlideDeltaPoint, step: SlideSize) =>
  Math.max(
    measureMarks(label, theme.label, Infinity, 'primary').widest,
    value
      ? measureText(value, { ...theme.value, size: theme.valueSizes[step] })
          .widest
      : scalePx(theme.placeholderWidth)
  );

/** Whether both sides fit `room` between them at a step. */
const sidesWithin =
  (points: readonly SlideDeltaPoint[], room: number) =>
  (step: SlideSize): boolean =>
    points.reduce((sum, point) => sum + sideWidth(point, step), 0) <= room;

/** What the note takes of the row at its narrowest: its gap, measure, padding, and rule. */
const noteFloor = scalePx(theme.columnGap) + scalePx(theme.noteMinWidth);

/** The node's own `size`, else the largest step at which the row holds both sides beside the note's floor across the layout, else the largest at which it holds them with the note wrapped under. */
export const deltaStep = (
  { before, after, size }: Pick<SlideDeltaNode, 'before' | 'after' | 'size'>,
  { width }: Pick<StepLayout, 'width'>
): SlideSize => {
  const pair = width - scalePx(theme.arrowWidth) - 2 * scalePx(theme.columnGap);
  const besideNote = sidesWithin([before, after], pair - noteFloor);
  const beside = stepWhere(besideNote);
  return (
    size ??
    (besideNote(beside)
      ? beside
      : stepWhere(sidesWithin([before, after], pair)))
  );
};
