/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, lanes } = tokens;
const { bracket, chip, join, notes } = lanes;

export const lanesModule = createStyleModule('lanes', ({ css }) => ({
  // Nothing in a row shrinks, so a lane too long for its room runs past it rather than crushing its chips.
  row: css`
    align-items: center;
    display: flex;
  `,
  lanes: css`
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
  `,
  lanesSize: variants(
    slideSizes,
    (size) => css`
      gap: ${lanes.rowGaps[size]};
    `
  ),
  lane: css`
    align-items: center;
    display: flex;
  `,
  laneSize: variants(
    slideSizes,
    (size) => css`
      height: ${lanes.rowHeights[size]};
    `
  ),
  label: css`
    color: ${color.textSubtle};
    flex: 0 0 auto;
    ${typeRole(lanes.label)}
    text-transform: uppercase;
  `,
  labelSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${lanes.labelSizes[size]};
      width: ${lanes.labelColumns[size]};
    `
  ),
  tonedLabel: css`
    color: ${toneVar};
  `,
  steps: css`
    align-items: center;
    display: flex;
    flex: 1 0 auto;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  // A chip and the line after it; lines share the slack equally.
  step: css`
    align-items: center;
    display: flex;
    flex: 1 0 auto;
  `,
  chip: css`
    background: ${color.bgSurface};
    border: ${chip.border} solid ${color.text};
    border-radius: ${chip.radius};
    color: ${color.text};
    display: flex;
    flex: 0 0 auto;
    ${typeRole(chip.type)}
    white-space: nowrap;
  `,
  chipSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${lanes.chipSizes[size]};
      padding: ${chip.paddings[size]};
    `
  ),
  tonedChip: css`
    border-color: ${toneVar};
    color: ${toneVar};
  `,
  line: css`
    background: ${color.line};
    flex: 1;
    height: ${lanes.line};
  `,
  lineSize: variants(
    slideSizes,
    (size) => css`
      min-width: ${lanes.lineMins[size]};
    `
  ),
  tonedLine: css`
    background: ${toneVar};
  `,
  merge: css`
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
  `,
  mergeSize: variants(
    slideSizes,
    (size) => css`
      width: ${lanes.bracketColumns[size]};
    `
  ),
  bracket: css`
    align-self: stretch;
    border: ${bracket.border} solid ${color.line};
    border-left: none;
    border-radius: 0 ${bracket.radius} ${bracket.radius} 0;
    flex: 1;
  `,
  bracketSize: variants(
    slideSizes,
    (size) => css`
      margin: ${bracket.insets[size]} 0;
    `
  ),
  stub: css`
    background: ${color.line};
    flex: 0 0 auto;
    height: ${bracket.border};
  `,
  stubSize: variants(
    slideSizes,
    (size) => css`
      width: ${bracket.stubs[size]};
    `
  ),
  join: css`
    background: ${color.primary};
    border-radius: ${join.radius};
    color: ${color.onPrimary};
    display: flex;
    flex: 0 0 auto;
    ${typeRole(join.type)}
    white-space: nowrap;
  `,
  joinSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${lanes.joinSizes[size]};
      padding: ${join.paddings[size]};
    `
  ),
  notes: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `,
  notesSize: variants(
    slideSizes,
    (size) => css`
      column-gap: ${notes.columnGaps[size]};
      margin: ${notes.gaps[size]} 0 0;
      padding: 0 0 0 ${lanes.labelColumns[size]};
      row-gap: ${notes.rowGaps[size]};
    `
  ),
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
  noteTitleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${notes.titleSizes[size]};
    `
  ),
  noteBody: css`
    color: ${color.textSoft};
    ${typeRole(notes.body)}
    margin: 0;
    text-wrap: pretty;
  `,
  noteBodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${notes.bodySizes[size]};
    `
  ),
}));
