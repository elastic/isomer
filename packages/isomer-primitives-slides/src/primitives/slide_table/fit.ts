/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { displayColumns } from '../../render/mono';
import { regularAdvance } from '../../theme/base';
import { frameContentWidth } from '../../theme/components/frame';
import { table } from '../../theme/components/table';
import { scalePx as px } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { lineFill } from '../size';
import { referenceRoom } from '../slide_heading/fit';

import { type SlideTableNode, tableGroups } from './schema';

const leading = ({ value }: { value: string }): number => parseFloat(value);

/** Estimated height at `step`, from the caption down, each row as tall as its longest cell wraps. */
export const tableHeight = (node: SlideTableNode, step: SlideSize): number => {
  const { columns, label } = node;
  const border = px(table.border);
  const cellWidth =
    (frameContentWidth - 2 * border) / columns.length -
    2 * px(table.paddingsX[step]);
  const fontPx = px(table.cellSizes[step]);
  const lines = (text: string): number =>
    Math.max(
      1,
      Math.ceil(
        (displayColumns(text) * regularAdvance * fontPx) /
          (cellWidth * lineFill)
      )
    );
  const labelLine = px(table.head.size) * leading(table.head.lineHeight);
  const rowHeight = (row: readonly string[]): number =>
    Math.max(1, ...row.map(lines)) * fontPx * leading(table.cell.lineHeight) +
    2 * px(table.cellPaddingsY[step]) +
    px(table.divider);
  const body = tableGroups(node).reduce(
    (total, { label: group, rows }, index) =>
      total +
      (group
        ? px((index > 0 ? table.groupGaps : table.groupPaddingsTop)[step]) +
          labelLine +
          px(table.groupPaddingsBottom[step]) +
          px(table.groupRule)
        : 0) +
      rows.reduce((sum, row) => sum + rowHeight(row), 0),
    0
  );
  return (
    (label ? labelLine + px(table.labelGap) : 0) +
    labelLine +
    2 * px(table.headPaddingsY[step]) +
    px(table.divider) +
    body +
    2 * border
  );
};

/** The node's own `size`, else the largest step whose estimated height fits the room below the heading. */
export const tableSize = (node: SlideTableNode, crowding = 1): SlideSize =>
  node.size ??
  slideSizes.find(
    (step) => tableHeight(node, step) <= referenceRoom / crowding
  ) ??
  's';
