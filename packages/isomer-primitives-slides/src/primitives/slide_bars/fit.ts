/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bars as theme, barsFit } from '../../theme/components/bars';
import { tone } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import {
  measureMarks,
  measureText,
  sizeForLoad,
  sizeForWidth,
  smallerStep,
} from '../size';

import type { SlideBarsItem, SlideBarsNode } from './schema';
import { barValue } from './value';

const maxShare = parseFloat(theme.barMaxShare.value);
const labelShare = parseFloat(theme.labelMaxShare.value) / 100;

/** The label column, `labelWidth` or `labelMaxShare` of a layout too narrow for it, and the track beside it. */
export const barsColumns = (
  width: number
): { column: number; track: number } => {
  const column = Math.min(
    scalePx(theme.labelWidth),
    Math.max(0, width) * labelShare
  );
  return { column, track: Math.max(0, width - column) };
};

/** `max`, else the largest value, else 1 when every value is 0. */
export const barsMax = ({ items, max }: SlideBarsNode): number =>
  (max ?? Math.max(...items.map(({ value }) => value))) || 1;

const cueWidth = scalePx(tone.cue.size) + scalePx(tone.cue.gap);

const lines = (
  marked: string,
  role: TypeRole,
  width: number,
  strong?: 'primary'
): number => Math.max(1, measureMarks(marked, role, width, strong).lines);

/** Two per label line, since a label line is a bar tall, and one per detail line under the bar. */
const rowsLoad =
  (items: readonly SlideBarsItem[], column: number, track: number) =>
  (step: SlideSize) =>
    items.reduce(
      (load, { label, detail, highlight }) =>
        load +
        2 *
          lines(
            label,
            { ...theme.label, size: theme.labelSizes[step] },
            column - (highlight ? cueWidth : 0),
            'primary'
          ) +
        (detail ? lines(detail, theme.detail, track) : 0),
      0
    );

/** The smallest of the step the rows' load takes under `crowding` and those at which each value fits beside its bar across `width`. */
export const barsStep = (
  node: SlideBarsNode,
  { width, crowding }: Pick<StepLayout, 'width' | 'crowding'>
): SlideSize => {
  const { items, size } = node;
  const { column, track } = barsColumns(width);
  const max = barsMax(node);
  const barMin = scalePx(theme.barMinWidth);
  return items.reduce<SlideSize>(
    (worst, { value }) =>
      smallerStep(
        worst,
        sizeForWidth(
          size,
          barValue(value),
          theme.value,
          track -
            (value > 0
              ? Math.max((track * (value / max) * maxShare) / 100, barMin)
              : 0) -
            scalePx(theme.valueGap),
          theme.valueSizes
        )
      ),
    sizeForLoad(size, rowsLoad(items, column, track), barsFit, crowding)
  );
};

/** The percent of the track a bar at `max` draws at `step`: `barMaxShare`, less whatever keeps each value beside its bar. */
export const barShare = (
  node: SlideBarsNode,
  track: number,
  step: SlideSize
): number => {
  const max = barsMax(node);
  const role = { ...theme.value, size: theme.valueSizes[step] };
  return Math.max(
    0,
    Math.min(
      maxShare,
      ...node.items
        .filter(({ value }) => value > 0)
        .map(
          ({ value }) =>
            ((track -
              scalePx(theme.valueGap) -
              measureText(barValue(value), role).widest) /
              Math.max(1, track)) *
            100 *
            (max / value)
        )
    )
  );
};
