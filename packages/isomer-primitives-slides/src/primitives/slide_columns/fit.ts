/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { columns, columnsFit } from '../../theme/components/columns';
import { frameContentWidth } from '../../theme/components/frame';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineBox,
  lineFill,
  measureText,
  narrowing,
  rowLoad,
  sizeForLoad,
  smallerStep,
  textColumns,
  widestWord,
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
          widestWord(title, columns.title.tracking) *
            scalePx(columns.titleSizes[step]) <=
          inner
      )
    ) ?? 's';
  const load =
    (rowLoad(
      items.map(({ title, tags = [], body }) => [
        title,
        ...tags,
        stripMarks(body),
      ])
    ) +
      (footnote
        ? textColumns(footnote.code) + textColumns(stripMarks(footnote.text))
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

/** Height of `tags` as chips wrapped across `inner`; a chip wider than the column wraps its own text. */
const tagsHeight = (tags: readonly string[], inner: number): number => {
  const frame =
    2 * scalePx(columns.tagPaddingX) + 2 * scalePx(columns.tagBorder);
  const chrome =
    2 * scalePx(columns.tagPaddingY) + 2 * scalePx(columns.tagBorder);
  const gap = scalePx(columns.tagGap);
  let total = 0;
  let row = 0;
  let used = 0;
  for (const tag of tags) {
    const natural = measureText(tag, columns.tag).widest + frame;
    const width = Math.min(natural, inner);
    const height =
      (natural > inner
        ? Math.max(1, measureText(tag, columns.tag, inner - frame).lines)
        : 1) *
        lineBox(columns.tag) +
      chrome;
    if (used > 0 && used + gap + width > inner) {
      total += row + gap;
      row = 0;
      used = 0;
    }
    used += (used > 0 ? gap : 0) + width;
    row = Math.max(row, height);
  }
  return total + row;
};

/** The tallest column's title and tags, so every body starts level. */
export const columnsHeadHeight = (
  items: SlideColumnsNode['items'],
  step: SlideSize,
  { width }: SlideLayout
): number => {
  const inner = columnInnerWidth(items.length, width);
  const title = { ...columns.title, size: columns.titleSizes[step] };
  return Math.max(
    ...items.map(({ title: text, tags = [] }) => {
      const titleHeight =
        Math.max(1, measureText(text, title, inner * lineFill).lines) *
        lineBox(title);
      return tags.length === 0
        ? titleHeight
        : titleHeight + scalePx(columns.gap) + tagsHeight(tags, inner);
    })
  );
};
