/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GRID_COLUMNS } from '../schema/grid';

import { createVarsModule } from './styles';
import { CHARTS_THEME } from './theme';

const { rowHeight, gap, sectionGap, headerHeight, descriptionHeight } =
  CHARTS_THEME.grid;

const oneLine = `
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const gridModule = createVarsModule(
  'chartsGrid',
  (vars) => ({
    clip: vars('clip', { maxHeight: 'none' }),
    place: vars('place', { column: 'auto', row: 'auto', height: 'auto' }),
  }),
  ({ css }, { clip, place }) => ({
    root: css`
      display: flex;
      flex-direction: column;
      gap: ${sectionGap}px;
    `,
    header: css`
      flex-shrink: 0;
      overflow: hidden;
    `,
    /** A panel's header, clipped to the panel's height. */
    clipped: css`
      ${clip}
      max-height: ${clip.maxHeight};
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
    /** A panel at its place on the grid's tracks. */
    placed: css`
      ${place}
      grid-column: ${place.column};
      grid-row: ${place.row};
    `,
    /** A panel in the one-column layout, as tall as its rows. */
    stacked: css`
      ${place}
      height: ${place.height};
    `,
    body: css`
      flex: 1;
      min-height: 0;
      overflow: hidden;
    `,
    collapsed: css`
      display: none;
    `,
  })
);
