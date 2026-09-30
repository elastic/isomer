/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { monoAdvance } from '../../theme/base';
import { columns, columnsFit } from '../../theme/components/columns';
import { frameContentWidth } from '../../theme/components/frame';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { lineFill, rowLoad, sizeForLoad, wrappedLines } from '../size';

import type { SlideColumnsNode } from './schema';

export const columnsStep = (
  { items, footnote, size }: SlideColumnsNode,
  crowding?: number
): SlideSize =>
  sizeForLoad(
    size,
    rowLoad(
      items.map(({ title, tags = [], body }) => [
        stripMarks(title),
        ...tags,
        stripMarks(body),
      ])
    ) +
      (footnote
        ? displayColumns(footnote.code) +
          displayColumns(stripMarks(footnote.text))
        : 0),
    columnsFit,
    crowding
  );

const chipRows = (widths: readonly number[], width: number, gap: number) => {
  let rows = 1;
  let used = 0;
  for (const chip of widths) {
    if (used > 0 && used + gap + chip > width) {
      rows += 1;
      used = chip;
    } else {
      used += (used > 0 ? gap : 0) + chip;
    }
  }
  return rows;
};

/** The tallest column's title and tags, so every body starts level. */
export const columnsHeadHeight = (
  items: SlideColumnsNode['items'],
  step: SlideSize
): number => {
  const inner =
    (frameContentWidth -
      (items.length - 1) *
        (2 * scalePx(columns.columnPadding) + scalePx(columns.rule))) /
    items.length;
  const titlePx = scalePx(columns.titleSizes[step]);
  const titleLine = titlePx * parseFloat(columns.title.lineHeight.value);
  const tagPx = scalePx(columns.tag.size);
  const tagFrame =
    2 * scalePx(columns.tagPaddingX) + 2 * scalePx(columns.tagBorder);
  const tagHeight =
    tagPx * parseFloat(columns.tag.lineHeight.value) +
    2 * scalePx(columns.tagPaddingY) +
    2 * scalePx(columns.tagBorder);
  const gap = scalePx(columns.tagGap);
  return Math.max(
    ...items.map(({ title, tags = [] }) => {
      const titleHeight =
        wrappedLines(
          stripMarks(title),
          titlePx,
          inner * lineFill,
          columns.title.tracking
        ) * titleLine;
      if (tags.length === 0) {
        return titleHeight;
      }
      const rows = chipRows(
        tags.map((tag) => displayColumns(tag) * monoAdvance * tagPx + tagFrame),
        inner,
        gap
      );
      return (
        titleHeight + scalePx(columns.gap) + rows * tagHeight + (rows - 1) * gap
      );
    })
  );
};
