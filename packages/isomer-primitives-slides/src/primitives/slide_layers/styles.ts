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
const { color, layers } = tokens;
const { band, chip } = layers;

export const layersModule = createStyleModule('layers', ({ css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  listSize: variants(
    slideSizes,
    (size) => css`
      gap: ${layers.gaps[size]};
    `
  ),
  // No track is narrower than its widest chip or its owner, so one too wide for the band runs past it rather than under its neighbor.
  band: css`
    align-items: center;
    background: ${color.bgSurface};
    border: ${band.border} solid ${color.border};
    border-radius: ${band.radius};
    display: grid;
    grid-template-columns:
      ${layers.nameColumn} minmax(auto, 1fr)
      auto;
  `,
  bandSize: variants(
    slideSizes,
    (size) => css`
      padding: ${band.paddings[size]};
    `
  ),
  name: css`
    color: ${color.text};
    ${typeRole(layers.name)}
  `,
  nameSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${layers.nameSizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(layers.body)}
    margin: 0;
    text-wrap: balance;
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${layers.bodySizes[size]};
    `
  ),
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${layers.chipGap};
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  chip: css`
    border: ${chip.border} solid ${color.border};
    border-radius: ${chip.radius};
    color: ${color.text};
    display: flex;
    ${typeRole(chip.type)}
    padding: ${chip.padding};
    white-space: nowrap;
  `,
  chipSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${layers.chipSizes[size]};
    `
  ),
  // Holds the owner so its track takes the owner's own width once that passes the column's.
  ownerCell: css`
    display: flex;
    padding-left: ${layers.ownerGap};
  `,
  owner: css`
    align-items: center;
    display: flex;
    flex: 1 0 auto;
    justify-content: flex-end;
    min-width: ${layers.ownerColumn};
    white-space: nowrap;
  `,
}));
