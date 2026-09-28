/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, quadrant } = tokens;
const { cell, chip } = quadrant;

const side = `minmax(${quadrant.axisColumn.value}, auto)`;

/** Distillate module for `slideQuadrant`. */
export const quadrantModule = createStyleModule('quadrant', ({ css }) => ({
  root: css`
    column-gap: ${quadrant.columnGap};
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: ${side} minmax(0, 1fr) ${side};
    grid-template-rows: auto minmax(0, 1fr) auto;
    min-height: 0;
    row-gap: ${quadrant.rowGap};
  `,
  axisTop: css`
    grid-column: 2;
    grid-row: 1;
    justify-self: center;
  `,
  axisLeft: css`
    align-self: center;
    grid-column: 1;
    grid-row: 2;
    justify-self: end;
    text-align: right;
  `,
  axisRight: css`
    align-self: center;
    grid-column: 3;
    grid-row: 2;
  `,
  axisBottom: css`
    grid-column: 2;
    grid-row: 3;
    justify-self: center;
  `,
  plot: css`
    display: grid;
    grid-column: 2;
    grid-row: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    min-height: 0;
  `,
  cell: css`
    display: flex;
    min-height: 0;
    min-width: 0;
  `,
  cellSize: variants(
    slideSizes,
    (size) => css`
      gap: ${cell.gaps[size]};
      padding: ${cell.paddings[size]};
    `
  ),
  // The axes are the borders between cells.
  cellTop: css`
    border-bottom: ${quadrant.axis} solid ${color.line};
    flex-direction: column;
  `,
  cellBottom: css`
    flex-direction: column-reverse;
  `,
  cellLeft: css`
    border-right: ${quadrant.axis} solid ${color.line};
  `,
  cellRight: css`
    text-align: right;
  `,
  caption: css`
    color: ${color.textSoft};
    ${typeRole(quadrant.caption)}
    margin: 0;
  `,
  // Chips grow from the caption's corner, so first rows line up across cells.
  items: css`
    align-content: flex-start;
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    justify-content: flex-start;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  itemsRight: css`
    justify-content: flex-end;
  `,
  itemsBottom: css`
    align-content: flex-end;
  `,
  highlighted: css`
    background: ${color.primaryBg};
  `,
  highlightedCaption: css`
    color: ${color.primary};
  `,
  highlightedChip: css`
    border-color: ${color.primary};
    color: ${color.primary};
  `,
  itemsSize: variants(
    slideSizes,
    (size) => css`
      gap: ${quadrant.chipGaps[size]};
    `
  ),
  chip: css`
    background: ${chip.fill};
    border: ${chip.border} solid ${color.text};
    border-radius: ${chip.radius};
    color: ${color.text};
    display: flex;
    ${typeRole(chip.type)}
    white-space: nowrap;
  `,
  chipSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${quadrant.chipSizes[size]};
      padding: ${chip.paddings[size]};
    `
  ),
}));
