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
const { color, statement } = tokens;

export const statementModule = createStyleModule('statement', ({ css }) => ({
  text: css`
    color: ${color.text};
    ${typeRole(statement.text)}
    margin: 0;
    max-width: ${statement.maxWidth};
    text-wrap: balance;
  `,
  textSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${statement.textSizes[size]};
    `
  ),
}));
