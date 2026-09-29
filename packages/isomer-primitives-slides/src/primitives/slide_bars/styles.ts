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
const { bars, color } = tokens;

export const barsModule = createStyleModule('bars', ({ css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  rowGap: variants(
    slideSizes,
    (size) => css`
      gap: ${bars.rowGaps[size]};
    `
  ),
  row: css`
    align-items: start;
    display: grid;
    grid-template-columns: ${bars.labelWidth} minmax(0, 1fr);
  `,
  label: css`
    color: ${color.text};
    font-weight: ${bars.label.weight};
  `,
  /** The label's line is the bar's height, so the two share a middle. */
  labelSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${bars.labelSizes[size]};
      line-height: ${bars.barHeights[size]};
    `
  ),
  measure: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  detailGap: variants(
    slideSizes,
    (size) => css`
      gap: ${bars.detailGaps[size]};
    `
  ),
  line: css`
    align-items: center;
    display: flex;
    gap: ${bars.valueGap};
  `,
  bar: css`
    background: ${color.text};
    border-radius: 0 ${bars.barRadius} ${bars.barRadius} 0;
    flex: 0 0 auto;
  `,
  barHeight: variants(
    slideSizes,
    (size) => css`
      height: ${bars.barHeights[size]};
    `
  ),
  barHighlighted: css`
    background: ${color.primary};
  `,
  value: css`
    color: ${color.text};
    flex: 0 0 auto;
    ${typeRole(bars.value)}
    white-space: nowrap;
  `,
  valueHighlighted: css`
    color: ${color.primary};
  `,
  valueSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${bars.valueSizes[size]};
    `
  ),
  detail: css`
    color: ${color.textSubtle};
    ${typeRole(bars.detail)}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));
