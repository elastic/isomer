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
const { color, quote } = tokens;

export const quoteModule = createStyleModule('quote', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: ${quote.attributionGap};
    margin: 0;
  `,
  text: css`
    color: ${color.text};
    ${typeRole(quote.text)}
    margin: 0;
    max-width: ${quote.maxWidth};
    text-indent: ${quote.hang};
    text-wrap: balance;
  `,
  textSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${quote.textSizes[size]};
    `
  ),
  attribution: css`
    align-items: center;
    display: flex;
    gap: ${quote.ruleGap};
  `,
  rule: css`
    background: ${color.text};
    flex: 0 0 auto;
    height: ${quote.rule};
    width: ${quote.ruleWidth};
  `,
  source: css`
    color: ${color.text};
    ${typeRole(quote.source)}
  `,
  context: css`
    color: ${color.textSoft};
    ${typeRole(quote.context)}
  `,
}));
