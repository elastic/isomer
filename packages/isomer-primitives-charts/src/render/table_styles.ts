/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import type { TableAlignment, TableScene } from '../scene/types';

import { createVarsModule } from './styles';
import { CHARTS_THEME } from './theme';

const theme = CHARTS_THEME.table;

const DENSITIES = Object.keys(theme.density) as Array<TableScene['density']>;
const ALIGNMENTS: readonly TableAlignment[] = ['left', 'center', 'right'];

const ellipsis = `
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * The table's handles, and the vars a Scene's colors and sizes reach them
 * through. Each handle that reads a var declares its default, so the vars are
 * set on the element that reads them.
 */
export const tableModule = createVarsModule(
  'chartsTable',
  (vars) => ({
    box: vars('box', {
      width: '100%',
      height: 'auto',
      ink: 'currentColor',
      fill: 'transparent',
    }),
    column: vars('column', { width: 'auto' }),
    rule: vars('rule', { color: 'currentColor' }),
    shade: vars('shade', { fill: 'transparent' }),
    ink: vars('ink', { color: 'currentColor' }),
    cell: vars('cell', { fill: 'transparent' }),
    bar: vars('bar', {
      track: 'transparent',
      fill: 'transparent',
      from: '0%',
      span: '0%',
    }),
    badge: vars('badge', { fill: 'transparent' }),
    gutter: vars('gutter', { basis: 'auto' }),
  }),
  ({ css }, { box, column, rule, shade, ink, cell, bar, badge, gutter }) => ({
    root: css`
      ${box}
      overflow: hidden;
      width: ${box.width};
      height: ${box.height};
      color: ${box.ink};
      background: ${box.fill};
    `,
    column: css`
      ${column}
      width: ${column.width};
    `,
    ruled: css`
      ${rule}
      border-bottom: ${theme.lineWidth}px solid ${rule.color};
    `,
    shaded: css`
      ${shade}
      background: ${shade.fill};
    `,
    ink: css`
      ${ink}
      color: ${ink.color};
    `,
    filled: css`
      ${cell}
      background: ${cell.fill};
    `,
    font: variants(
      DENSITIES,
      (density) => css`
        font-size: ${theme.density[density].font}px;
      `
    ),
    title: css`
      ${ellipsis}
      height: ${theme.titleHeight}px;
      line-height: ${theme.titleHeight}px;
      font-size: ${CHARTS_THEME.type.title}px;
      font-weight: ${theme.headerWeight};
    `,
    line: css`
      ${ellipsis}
      height: ${theme.lineHeight}px;
      line-height: ${theme.lineHeight}px;
      font-size: ${CHARTS_THEME.type.body}px;
    `,
    table: css`
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    `,
    cell: css`
      ${ellipsis}
      box-sizing: border-box;
    `,
    row: variants(
      DENSITIES,
      (density) => css`
        height: ${theme.density[density].rowHeight}px;
        padding: 0 ${theme.density[density].padding}px;
      `
    ),
    align: variants(
      ALIGNMENTS,
      (alignment) => css`
        text-align: ${alignment};
      `
    ),
    heading: css`
      font-weight: ${theme.headerWeight};
    `,
    rowHeading: css`
      font-weight: normal;
    `,
    barCell: css`
      display: flex;
      align-items: center;
      gap: ${theme.barGap}px;
    `,
    barValue: css`
      ${ellipsis}
      ${gutter}
      flex: 0 0 ${gutter.basis};
    `,
    bar: css`
      ${bar}
      position: relative;
      flex: 1;
      background: ${bar.track};
    `,
    barFill: css`
      ${bar}
      position: absolute;
      top: 0;
      left: ${bar.from};
      width: ${bar.span};
      background: ${bar.fill};
    `,
    barShape: variants(
      DENSITIES,
      (density) => css`
        height: ${theme.density[density].rowHeight * theme.barThickness}px;
        border-radius: ${
          (theme.density[density].rowHeight * theme.barThickness) / 2
        }px;
      `
    ),
    badge: css`
      ${ellipsis}
      display: inline-block;
      max-width: 100%;
      padding: 0 ${theme.badgePadding}px;
      border-radius: ${theme.badgeRadius}px;
      vertical-align: middle;
      ${badge}
      background: ${badge.fill};
    `,
    pager: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
    `,
    pages: css`
      display: flex;
      gap: ${theme.pageGap}px;
    `,
    page: css`
      font-weight: ${theme.headerWeight};
    `,
  })
);
