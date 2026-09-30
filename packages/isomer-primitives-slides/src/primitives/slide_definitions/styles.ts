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
const { color, definitions } = tokens;

export const definitionsModule = createStyleModule(
  'definitions',
  ({ css }) => ({
    columns: css`
      display: flex;
      gap: ${definitions.columnGap};
    `,
    list: css`
      border-top: ${definitions.rule} solid ${color.border};
      display: flex;
      flex: 1;
      flex-direction: column;
      margin: 0;
      min-width: 0;
    `,
    row: css`
      border-bottom: ${definitions.rule} solid ${color.border};
      display: flex;
      flex-direction: column;
      gap: ${definitions.rowGap};
    `,
    rowSize: variants(
      slideSizes,
      (size) => css`
        padding: ${definitions.rowPaddings[size]};
      `
    ),
    term: css`
      color: ${color.primary};
      ${typeRole(definitions.term)}
    `,
    termSize: variants(
      slideSizes,
      (size) => css`
        font-size: ${definitions.termSizes[size]};
      `
    ),
    body: css`
      color: ${color.textSoft};
      ${typeRole(definitions.body)}
      margin: 0;
      text-wrap: pretty;
    `,
    bodySize: variants(
      slideSizes,
      (size) => css`
        font-size: ${definitions.bodySizes[size]};
      `
    ),
  })
);
