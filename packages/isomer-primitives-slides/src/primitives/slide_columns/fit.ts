/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { monoAdvance } from '../../theme/base';
import { columns, columnsFit } from '../../theme/components/columns';
import { frameContentWidth } from '../../theme/components/frame';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineBox,
  lineFill,
  narrowing,
  packedLines,
  rowLoad,
  sizeForLoad,
  smallerStep,
  widestWord,
  wrappedLines,
} from '../size';

import type { SlideColumnsNode } from './schema';

/** Budgets hold across the frame body; a narrower layout scales the load up, and no step breaks a title word. */
export const columnsStep = (
  { items, footnote, size }: SlideColumnsNode,
  { width, crowding } = slideLayout(undefined)
): SlideSize => {
  if (size) {
    return size;
  }
  const inner = columnInnerWidth(items.length, width);
  const unbroken =
    slideSizes.find((step) =>
      items.every(
        ({ title }) =>
          widestWord(stripMarks(title), columns.title.tracking) *
            scalePx(columns.titleSizes[step]) <=
          inner
      )
    ) ?? 's';
  const load =
    (rowLoad(
      items.map(({ title, tags = [], body }) => [
        stripMarks(title),
        ...tags,
        stripMarks(body),
      ])
    ) +
      (footnote
        ? displayColumns(footnote.code) +
          displayColumns(stripMarks(footnote.text))
        : 0)) *
    narrowing(frameContentWidth, width);
  return smallerStep(
    sizeForLoad(undefined, load, columnsFit, crowding),
    unbroken
  );
};

/** Text width inside each of `count` columns across `width`. */
export const columnInnerWidth = (count: number, width: number): number =>
  Math.max(
    0,
    (width -
      (count - 1) *
        (2 * scalePx(columns.columnPadding) + scalePx(columns.rule))) /
      count
  );

/** The tallest column's title and tags, so every body starts level. */
export const columnsHeadHeight = (
  items: SlideColumnsNode['items'],
  step: SlideSize,
  { width }: SlideLayout
): number => {
  const inner = columnInnerWidth(items.length, width);
  const titleSize = columns.titleSizes[step];
  const tagPx = scalePx(columns.tag.size);
  const tagFrame =
    2 * scalePx(columns.tagPaddingX) + 2 * scalePx(columns.tagBorder);
  const tagHeight =
    lineBox(columns.tag) +
    2 * scalePx(columns.tagPaddingY) +
    2 * scalePx(columns.tagBorder);
  const gap = scalePx(columns.tagGap);
  return Math.max(
    ...items.map(({ title, tags = [] }) => {
      const titleHeight =
        wrappedLines(
          stripMarks(title),
          scalePx(titleSize),
          inner * lineFill,
          columns.title.tracking
        ) * lineBox({ size: titleSize, lineHeight: columns.title.lineHeight });
      if (tags.length === 0) {
        return titleHeight;
      }
      const rows = packedLines(
        tags.map((tag) => displayColumns(tag) * monoAdvance * tagPx + tagFrame),
        gap,
        inner
      );
      return (
        titleHeight + scalePx(columns.gap) + rows * tagHeight + (rows - 1) * gap
      );
    })
  );
};
