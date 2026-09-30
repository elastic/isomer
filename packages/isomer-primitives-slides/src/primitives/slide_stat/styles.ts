/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, stat } = tokens;

export const statModule = createStyleModule('stat', ({ css }) => ({
  root: css`
    align-items: baseline;
    border-top: ${stat.rule} solid ${color.border};
    display: flex;
    flex: 0 0 auto;
    gap: ${stat.gap};
    padding-top: ${stat.paddingTop};
  `,
  value: css`
    color: ${color.primary};
    flex: 0 0 auto;
    ${typeRole(stat.value)}
    white-space: nowrap;
  `,
  placeholder: css`
    align-self: center;
    flex: 0 0 auto;
    height: ${stat.placeholderHeight};
    width: ${stat.placeholderWidth};
  `,
  body: css`
    color: ${color.textSoft};
    ${typeRole(stat.body)}
    margin: 0;
    max-width: ${stat.bodyMaxWidth};
    text-wrap: pretty;
  `,
}));
