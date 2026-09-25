/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { renderGridShapes } from '../../theme/components/render_grid';
import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, renderGrid } = tokens;

/** Distillate module for `slideRenderGrid`. */
export const renderGridModule = createStyleModule('renderGrid', ({ css }) => ({
  root: css`
    align-content: center;
    display: grid;
    flex: 1;
    gap: ${renderGrid.gap};
    min-height: 0;
  `,
  shape: variants(renderGridShapes, (shape) => {
    const { columns, rows, rowTrack } = renderGrid.shape[shape];
    return css`
      grid-template-columns: repeat(${columns}, minmax(0, 1fr));
      grid-template-rows: repeat(${rows}, ${rowTrack});
    `;
  }),
  cell: css`
    display: flex;
    flex-direction: column;
    gap: ${renderGrid.cellGap};
    margin: 0;
    min-height: 0;
    min-width: 0;
  `,
  head: css`
    align-items: baseline;
    display: flex;
    gap: ${renderGrid.headGap};
    min-width: 0;
  `,
  name: css`
    color: ${color.text};
    flex: none;
    ${typeRole(renderGrid.name)}
  `,
  caption: css`
    color: ${color.textSoft};
    ${typeRole(renderGrid.caption)}
    min-width: 0;
  `,
  panel: variants(renderGridShapes, (shape) => {
    const { panelAspect, panelGrow } = renderGrid.shape[shape];
    return css`
      aspect-ratio: ${panelAspect};
      flex: ${panelGrow} 1 auto;
      width: 100%;
    `;
  }),
  slideScale: variants(
    renderGridShapes,
    (shape) => css`
      transform: scale(${renderGrid.shape[shape].scale});
    `
  ),
  outputScale: css`
    transform: scale(${renderGrid.outputScale});
    transform-origin: 0 0;
    width: calc(100% / ${renderGrid.outputScale});
  `,
}));
