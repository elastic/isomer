/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, source } = tokens;

/** Distillate module for `slideSource`. */
export const sourceModule = createStyleModule('source', ({ css }) => ({
  text: css`
    color: ${color.textSubtle};
    flex: 0 0 auto;
    ${typeRole(source.text)}
    margin: 0;
  `,
}));
