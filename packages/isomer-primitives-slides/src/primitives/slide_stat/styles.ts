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

/** Distillate module for `slideStat`. */
export const statModule = createStyleModule('stat', ({ css }) => ({
  root: css`
    align-items: baseline;
    border-top: ${stat.rule} solid ${color.border};
    display: flex;
    flex: none;
    gap: ${stat.gap};
    padding-top: ${stat.paddingTop};
  `,
  value: css`
    color: ${color.primary};
    flex: none;
    ${typeRole(stat.value)}
    white-space: nowrap;
  `,
  placeholder: css`
    align-self: center;
    flex: none;
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
