/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, lanes } = tokens;
const { bracket, chip, join, notes } = lanes;

const columns = `${lanes.labelColumn.value} minmax(0, 1fr) ${lanes.bracketColumn.value} auto`;

/** Distillate module for `slideLanes`. */
export const lanesModule = createStyleModule('lanes', ({ css }) => ({
  grid: css`
    display: grid;
    grid-template-columns: ${columns};
    grid-template-rows: ${lanes.rowHeight} ${lanes.rowHeight};
    row-gap: ${lanes.rowGap};
  `,
  label: css`
    align-self: center;
    color: ${color.textSubtle};
    grid-column: 1;
    ${typeRole(lanes.label)}
    text-transform: uppercase;
  `,
  steps: css`
    align-items: center;
    display: flex;
    grid-column: 2;
    list-style: none;
    margin: 0;
    min-width: 0;
    padding: 0;
  `,
  // A chip and the line after it; lines share the slack equally.
  step: css`
    align-items: center;
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
  `,
  chip: css`
    background: ${color.bgSurface};
    border: ${chip.border} solid ${color.text};
    border-radius: ${chip.radius};
    color: ${color.text};
    display: flex;
    flex: none;
    ${typeRole(chip.type)}
    padding: ${chip.padding};
    white-space: nowrap;
  `,
  line: css`
    background: ${color.line};
    flex: 1;
    height: ${lanes.line};
    min-width: ${lanes.lineMin};
  `,
  merge: css`
    align-items: center;
    display: flex;
    grid-column: 3;
    grid-row: 1 / 3;
  `,
  bracket: css`
    align-self: stretch;
    border: ${bracket.border} solid ${color.line};
    border-left: none;
    border-radius: 0 ${bracket.radius} ${bracket.radius} 0;
    flex: 1;
    margin: ${bracket.inset} 0;
  `,
  stub: css`
    background: ${color.line};
    flex: none;
    height: ${bracket.border};
    width: ${bracket.stub};
  `,
  join: css`
    align-self: center;
    background: ${join.fill};
    border-radius: ${join.radius};
    color: ${join.color};
    display: flex;
    ${typeRole(join.type)}
    grid-column: 4;
    grid-row: 1 / 3;
    padding: ${join.padding};
    white-space: nowrap;
  `,
  notes: css`
    column-gap: ${notes.columnGap};
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: ${notes.gap} 0 0;
    padding: 0 0 0 ${lanes.labelColumn};
    row-gap: ${notes.rowGap};
  `,
  note: css`
    display: flex;
    flex-direction: column;
    gap: ${notes.itemGap};
    min-width: 0;
  `,
  noteTitle: css`
    color: ${color.text};
    ${typeRole(notes.title)}
    margin: 0;
  `,
  noteBody: css`
    color: ${color.textSoft};
    ${typeRole(notes.body)}
    margin: 0;
    text-wrap: pretty;
  `,
}));
