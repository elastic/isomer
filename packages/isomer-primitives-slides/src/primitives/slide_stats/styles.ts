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
const { color, stats } = tokens;

export const statsModule = createStyleModule('stats', ({ css }) => ({
  list: css`
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-width: 0;
  `,
  /** Every column after the first: a rule on its left. */
  ruled: css`
    border-left: ${stats.rule} solid ${color.border};
    padding-left: ${stats.columnPadding};
  `,
  /** Every column before the last: room before the next rule. */
  gutter: css`
    padding-right: ${stats.columnPadding};
  `,
  value: css`
    align-items: baseline;
    color: ${color.text};
    display: flex;
    gap: ${stats.unitGap};
    ${typeRole(stats.value)}
  `,
  valueSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${stats.valueSizes[size]};
    `
  ),
  unit: css`
    ${typeRole(stats.unit)}
  `,
  placeholder: css`
    flex: 0 0 auto;
  `,
  placeholderHeight: variants(
    slideSizes,
    (size) => css`
      height: ${stats.placeholderHeights[size]};
    `
  ),
  label: css`
    color: ${color.text};
    ${typeRole(stats.label)}
    margin: ${stats.labelGap} 0 0;
  `,
  body: css`
    color: ${color.textSoft};
    ${typeRole(stats.body)}
    margin: ${stats.bodyGap} 0 0;
    text-wrap: pretty;
  `,
}));
