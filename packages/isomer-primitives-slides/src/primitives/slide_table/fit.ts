/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { displayColumns } from '../../render/mono';
import { regularAdvance, type } from '../../theme/base';
import { label as labelTheme } from '../../theme/components/shared';
import { table } from '../../theme/components/table';
import { scalePx as px } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { openBody } from '../layout';
import { lineFill, proseLines, wrappedLines } from '../size';

import { type SlideTableNode, tableGroups } from './schema';

const leading = ({ value }: { value: string }): number => parseFloat(value);

/** Estimated height at `step` across `width`, from the caption down, each row as tall as its longest cell wraps. */
export const tableHeight = (
  node: SlideTableNode,
  step: SlideSize,
  width: number
): number => {
  const { columns, label } = node;
  const border = px(table.border);
  const cellWidth = Math.max(
    1,
    (width - 2 * border) / columns.length - 2 * px(table.paddingsX[step])
  );
  const fontPx = px(table.cellSizes[step]);
  const across = cellWidth * lineFill;
  // A word wider than its cell counts the lines its characters would fill.
  const lines = (text: string): number =>
    Math.max(
      proseLines(text, fontPx, across),
      Math.ceil((displayColumns(text) * regularAdvance * fontPx) / across)
    );
  const labelLine = px(table.head.size) * leading(table.head.lineHeight);
  const headLines = Math.max(
    1,
    ...columns.map((column) =>
      wrappedLines(
        column.toUpperCase(),
        px(table.head.size),
        cellWidth,
        table.head.tracking
      )
    )
  );
  const rowHeight = (row: readonly string[]): number =>
    Math.max(1, ...row.map(lines)) * fontPx * leading(table.cell.lineHeight) +
    2 * px(table.cellPaddingsY[step]) +
    px(table.divider);
  const body = tableGroups(node).reduce(
    (total, { label: group, rows }, index) =>
      total +
      (group
        ? px((index > 0 ? table.groupGaps : table.groupPaddingsTop)[step]) +
          wrappedLines(
            group.toUpperCase(),
            px(table.group.size),
            Math.max(1, width - 2 * border - 2 * px(table.paddingsX[step])),
            table.group.tracking
          ) *
            px(table.group.size) *
            leading(table.group.lineHeight) +
          px(table.groupPaddingsBottom[step]) +
          px(table.groupRule)
        : 0) +
      rows.reduce((sum, row) => sum + rowHeight(row), 0),
    0
  );
  return (
    (label
      ? wrappedLines(
          label.toUpperCase(),
          px(labelTheme.size),
          width,
          labelTheme.tracking
        ) *
          px(labelTheme.size) *
          leading(type.label.lineHeight) +
        px(table.labelGap)
      : 0) +
    headLines * labelLine +
    2 * px(table.headPaddingsY[step]) +
    px(table.divider) +
    body +
    2 * border
  );
};

/** The node's own `size`, else the largest step whose estimated height fits `layout`. */
export const tableSize = (
  node: SlideTableNode,
  { width, height }: SlideLayout = openBody
): SlideSize =>
  node.size ??
  slideSizes.find((step) => tableHeight(node, step, width) <= height) ??
  's';
