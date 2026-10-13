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
const { agenda, color } = tokens;

export const agendaModule = createStyleModule('agenda', ({ css }) => ({
  list: css`
    border-top: ${agenda.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  row: css`
    align-items: baseline;
    border-bottom: ${agenda.rule} solid ${color.border};
    column-gap: ${agenda.countGap};
    display: grid;
    grid-template-columns: ${agenda.numberWidth} minmax(0, 1fr) auto;
  `,
  rowSize: variants(
    slideSizes,
    (size) => css`
      padding: ${agenda.rowPaddings[size]} 0;
    `
  ),
  upcoming: css`
    color: ${color.text};
  `,
  past: css`
    color: ${color.textSoft};
  `,
  current: css`
    color: ${color.primary};
  `,
  number: css`
    ${typeRole(agenda.number)}
  `,
  numberSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${agenda.numberSizes[size]};
    `
  ),
  title: css`
    ${typeRole(agenda.title)}
    text-wrap: balance;
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${agenda.titleSizes[size]};
    `
  ),
  count: css`
    color: ${color.textSubtle};
    ${typeRole(agenda.count)}
  `,
}));
