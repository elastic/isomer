/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { countKeys, countOf, slideSizes } from '../../theme/variants';

import { tableMaxColumns } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, table } = tokens;

export const tableModule = createStyleModule('table', ({ css }) => ({
  root: css`
    border-spacing: 0;
    display: flex;
    flex-direction: column;
    margin: 0;
  `,
  caption: css`
    display: flex;
    line-height: ${table.labelLineHeight};
    margin-bottom: ${table.labelGap};
  `,
  // The caption sits above the border, so the row groups draw it between them.
  rows: css`
    background: ${color.bgSurface};
    border-left: ${table.border} solid ${color.border};
    border-right: ${table.border} solid ${color.border};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  rowsFirst: css`
    border-top: ${table.border} solid ${color.border};
    border-top-left-radius: ${table.radius};
    border-top-right-radius: ${table.radius};
  `,
  rowsLast: css`
    border-bottom: ${table.border} solid ${color.border};
    border-bottom-left-radius: ${table.radius};
    border-bottom-right-radius: ${table.radius};
  `,
  // Each row is its own grid, since takumi lays out no `display: contents`.
  row: css`
    display: grid;
  `,
  columns: variants(
    countKeys(1, tableMaxColumns),
    (count) => css`
      grid-template-columns: repeat(${countOf(count)}, minmax(0, 1fr));
    `
  ),
  divided: css`
    border-bottom: ${table.divider} solid ${color.border};
  `,
  head: css`
    background: ${color.bgTableHead};
    border-bottom: ${table.divider} solid ${color.border};
    color: ${color.textSubtle};
    display: flex;
    ${typeRole(table.head)}
    text-align: left;
  `,
  headStep: variants(
    slideSizes,
    (size) => css`
      padding: ${table.headPaddingsY[size]} ${table.paddingsX[size]};
    `
  ),
  cell: css`
    display: flex;
    text-align: left;
  `,
  value: css`
    color: ${color.textSoft};
  `,
  rowHeader: css`
    color: ${color.text};
  `,
  valueStep: variants(
    slideSizes,
    (size) => css`
      ${typeRole({ ...table.cell, size: table.cellSizes[size] })}
    `
  ),
  rowHeaderStep: variants(
    slideSizes,
    (size) => css`
      ${typeRole({
        ...table.cell,
        size: table.cellSizes[size],
        weight: table.rowHeaderWeight,
      })}
    `
  ),
  cellStep: variants(
    slideSizes,
    (size) => css`
      padding: ${table.cellPaddingsY[size]} ${table.paddingsX[size]};
    `
  ),
  group: css`
    border-bottom: ${table.groupRule} solid ${color.text};
    color: ${color.textSubtle};
    display: flex;
    ${typeRole(table.group)}
    text-align: left;
  `,
  groupStep: variants(
    slideSizes,
    (size) => css`
      padding-bottom: ${table.groupPaddingsBottom[size]};
      padding-left: ${table.paddingsX[size]};
      padding-right: ${table.paddingsX[size]};
    `
  ),
  groupFirst: variants(
    slideSizes,
    (size) => css`
      padding-top: ${table.groupPaddingsTop[size]};
    `
  ),
  groupLater: variants(
    slideSizes,
    (size) => css`
      padding-top: ${table.groupGaps[size]};
    `
  ),
}));
