/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideTableColumnCounts } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, table } = tokens;

/** Distillate module for `slideTable`. */
export const tableModule = createStyleModule('table', ({ css }) => ({
  root: css`
    gap: ${table.labelGap};
  `,
  // One grid for every cell, so `auto` tracks size each column to its widest cell.
  grid: css`
    background: ${color.bgSurface};
    border: ${table.border} solid ${color.border};
    border-radius: ${table.radius};
    display: grid;
    overflow: hidden;
  `,
  columns: variants(
    slideTableColumnCounts,
    (count) => css`
      grid-template-columns: repeat(
        ${slideTableColumnCounts.indexOf(count) + 1},
        auto
      );
    `
  ),
  head: css`
    background: ${color.bgTableHead};
    border-bottom: ${table.divider} solid ${color.border};
    color: ${color.textSubtle};
    display: flex;
    ${typeRole(table.head)}
    padding: ${table.headPadding};
    text-transform: uppercase;
  `,
  cell: css`
    display: flex;
    padding: ${table.cellPadding};
  `,
  divided: css`
    border-bottom: ${table.divider} solid ${color.border};
  `,
  value: css`
    color: ${color.textSoft};
    ${typeRole(table.cell)}
  `,
  rowHeader: css`
    color: ${color.text};
    ${typeRole({ ...table.cell, weight: table.rowHeaderWeight })}
  `,
  group: css`
    border-bottom: ${table.groupRule} solid ${color.text};
    color: ${color.textSubtle};
    display: flex;
    grid-column: 1 / -1;
    ${typeRole(table.group)}
    padding-bottom: ${table.groupPaddingBottom};
    padding-left: ${table.groupPaddingX};
    padding-right: ${table.groupPaddingX};
    text-transform: uppercase;
  `,
  firstGroup: css`
    padding-top: ${table.groupPaddingTop};
  `,
  laterGroup: css`
    padding-top: ${table.groupGap};
  `,
}));
