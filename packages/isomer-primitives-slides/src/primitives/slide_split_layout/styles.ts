/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSplitDividers, slideSplitRatios } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, split } = tokens;

export const splitModule = createStyleModule('split', ({ css }) => ({
  // The middle track is `auto`, sized by the divider (zero wide for `gap`).
  // The fill role centers the grid and shrinks it to the room left, so each column is its pane's height and bounds its items.
  grid: css`
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
  `,
  ratio: variants(slideSplitRatios, (ratio) => {
    const { left, right } = split.ratio[ratio];
    return css`
      grid-template-columns: minmax(0, ${left}) auto minmax(0, ${right});
    `;
  }),
  divider: variants(
    slideSplitDividers,
    (divider) => css`
      column-gap: ${split.dividerGap[divider]};
    `
  ),
  rule: css`
    align-self: stretch;
    background: ${color.line};
    border-radius: ${split.ruleRadius};
    width: ${split.ruleWidth};
  `,
  hairline: css`
    align-self: stretch;
    background: ${color.border};
    width: ${split.hairlineWidth};
  `,
  arrow: css`
    align-self: center;
    width: ${split.arrowWidth};
  `,
  column: css`
    display: flex;
    flex-direction: column;
    gap: ${split.labelGap};
    min-width: 0;
  `,
  label: css`
    ${typeRole(split.label)}
    margin: 0;
  `,
  plainLabel: css`
    color: ${color.textSubtle};
  `,
  tonedLabel: css`
    color: ${toneVar};
  `,
  items: css`
    display: flex;
    flex-direction: column;
    gap: ${split.itemGap};
    min-height: 0;
  `,
  footnote: css`
    color: ${color.textSoft};
    flex: 0 0 auto;
    ${typeRole(split.footnote)}
    margin: ${split.footnoteGap} 0 0;
    max-width: ${split.footnoteMaxWidth};
    text-wrap: balance;
  `,
}));
