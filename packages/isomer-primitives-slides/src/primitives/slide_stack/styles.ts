/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { slideStackSpacings } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { stack } = tokens;

/** Distillate module for `slideStack`. */
export const stackModule = createStyleModule('stack', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  `,
  spacing: variants(
    slideStackSpacings,
    (spacing) => css`
      gap: ${stack.spacing[spacing]};
    `
  ),
}));
