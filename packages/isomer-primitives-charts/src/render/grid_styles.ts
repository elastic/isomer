/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_COLUMNS } from '../schema/grid';

import { chartsDistillery } from './styles';
import { CHARTS_THEME } from './theme';

const { rowHeight, gap, sectionGap, headerHeight, descriptionHeight } =
  CHARTS_THEME.grid;

const oneLine = `
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const gridModule = chartsDistillery.createStyleModule(
  'chartsGrid',
  ({ css }) => ({
    root: css`
      display: flex;
      flex-direction: column;
      gap: ${sectionGap}px;
    `,
    header: css`
      flex-shrink: 0;
      overflow: hidden;
    `,
    heading: css`
      ${oneLine}
      height: ${headerHeight}px;
      font-size: ${CHARTS_THEME.type.title}px;
    `,
    description: css`
      ${oneLine}
      height: ${descriptionHeight}px;
      font-size: ${CHARTS_THEME.type.body}px;
    `,
    sectionGap: css`
      height: ${sectionGap / 2}px;
    `,
    panels: css`
      display: grid;
      grid-template-columns: repeat(${GRID_COLUMNS}, minmax(0, 1fr));
      grid-auto-rows: ${rowHeight}px;
      gap: ${gap}px;
    `,
    column: css`
      display: flex;
      flex-direction: column;
      gap: ${gap}px;
    `,
    panel: css`
      display: flex;
      flex-direction: column;
      min-width: 0;
    `,
    body: css`
      flex: 1;
      min-height: 0;
    `,
    collapsed: css`
      display: none;
    `,
  })
);
