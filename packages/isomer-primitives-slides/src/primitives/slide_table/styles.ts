/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { countKeys, countOf } from '../../theme/variants';

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
    padding: ${table.headPadding};
    text-align: left;
    text-transform: uppercase;
  `,
  cell: css`
    display: flex;
    padding: ${table.cellPadding};
    text-align: left;
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
    ${typeRole(table.group)}
    padding-bottom: ${table.groupPaddingBottom};
    padding-left: ${table.groupPaddingX};
    padding-right: ${table.groupPaddingX};
    text-align: left;
    text-transform: uppercase;
  `,
  groupFirst: css`
    padding-top: ${table.groupPaddingTop};
  `,
  groupLater: css`
    padding-top: ${table.groupGap};
  `,
}));
