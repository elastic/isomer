/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { label as labelTheme } from '../../theme/components/shared';
import { table } from '../../theme/components/table';
import { scalePx as px } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { openBody } from '../layout';
import { lineBox, lineFill, measureText } from '../size';

import { type SlideTableNode, tableGroups } from './schema';

const lines = (text: string, role: TypeRole, width: number): number =>
  Math.max(1, measureText(text, role, width).lines);

/** Estimated height at `step` across `width`, from the caption down, each row as tall as its longest cell wraps. */
export const tableHeight = (
  node: SlideTableNode,
  step: SlideSize,
  width: number
): number => {
  const { columns, label, rowHeaders } = node;
  const border = px(table.border);
  const padding = 2 * px(table.paddingsX[step]);
  const inner = width - 2 * border;
  const cellWidth = inner / columns.length - padding;
  const cell = { ...table.cell, size: table.cellSizes[step] };
  const rowHeader = { ...cell, weight: table.rowHeaderWeight };
  const headLines = Math.max(
    ...columns.map((column) => lines(column, table.head, cellWidth))
  );
  const rowHeight = (row: readonly string[]): number =>
    Math.max(
      1,
      ...row.map((text, index) =>
        lines(
          text,
          rowHeaders && index === 0 ? rowHeader : cell,
          cellWidth * lineFill
        )
      )
    ) *
      lineBox(cell) +
    2 * px(table.cellPaddingsY[step]) +
    px(table.divider);
  const body = tableGroups(node).reduce(
    (total, { label: group, rows }, index) =>
      total +
      (group
        ? px((index > 0 ? table.groupGaps : table.groupPaddingsTop)[step]) +
          lines(group, table.group, inner - padding) * lineBox(table.group) +
          px(table.groupPaddingsBottom[step]) +
          px(table.groupRule)
        : 0) +
      rows.reduce((sum, row) => sum + rowHeight(row), 0),
    0
  );
  return (
    (label
      ? lines(label, labelTheme, width) *
          lineBox({
            size: labelTheme.size,
            lineHeight: table.labelLineHeight,
          }) +
        px(table.labelGap)
      : 0) +
    headLines * lineBox(table.head) +
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
