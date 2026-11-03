/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { label as labelTheme } from '../../theme/components/shared';
import { table } from '../../theme/components/table';
import { scalePx } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import type { SlideSize } from '../../theme/variants';
import { openBody } from '../layout';
import { lineBox, lineFill, measureText, stepWhere } from '../size';

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
  const border = scalePx(table.border);
  const padding = 2 * scalePx(table.paddingsX[step]);
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
    2 * scalePx(table.cellPaddingsY[step]);
  const groups = tableGroups(node);
  const rowCount = groups.reduce((count, { rows }) => count + rows.length, 0);
  // Every row but the table's last draws a divider below it.
  const dividers = Math.max(0, rowCount - 1) * scalePx(table.divider);
  const body = groups.reduce(
    (total, { label: group, rows }, index) =>
      total +
      (group
        ? scalePx(
            (index > 0 ? table.groupGaps : table.groupPaddingsTop)[step]
          ) +
          lines(group, table.group, inner - padding) * lineBox(table.group) +
          scalePx(table.groupPaddingsBottom[step]) +
          scalePx(table.groupRule)
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
        scalePx(table.labelGap)
      : 0) +
    headLines * lineBox(table.head) +
    2 * scalePx(table.headPaddingsY[step]) +
    scalePx(table.divider) +
    body +
    dividers +
    2 * border
  );
};

/** The node's own `size`, else the largest step whose estimated height fits `layout`. */
export const tableStep = (
  node: SlideTableNode,
  { width, height }: SlideLayout = openBody
): SlideSize =>
  node.size ?? stepWhere((step) => tableHeight(node, step, width) <= height);
