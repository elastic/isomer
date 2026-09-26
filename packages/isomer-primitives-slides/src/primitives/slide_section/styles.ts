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
const { color, section } = tokens;

/** Distillate module for `slideSection`. */
export const sectionModule = createStyleModule('section', ({ css }) => ({
  root: css`
    align-items: end;
    column-gap: ${section.columnGap};
    display: grid;
    flex: 1;
    grid-template-columns: ${section.columns};
    min-height: 0;
  `,
  heading: css`
    display: flex;
    flex-direction: column;
    gap: ${section.titleGap};
    margin: 0;
  `,
  number: css`
    color: ${color.primary};
    ${typeRole(section.number)}
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${section.titleSizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(section.title)}
  `,
  contents: css`
    border-top: ${section.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  row: css`
    border-bottom: ${section.rule} solid ${color.border};
    color: ${color.text};
    display: flex;
    ${typeRole(section.row)}
    padding: ${section.rowPaddingY} 0;
    text-wrap: balance;
  `,
  link: css`
    color: inherit;
    text-decoration: none;
  `,
}));
