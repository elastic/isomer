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
const { color, heading } = tokens;

/** Distillate module for `slideHeading`. */
export const headingModule = createStyleModule('heading', ({ css }) => ({
  root: css`
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: ${heading.ledeGap};
  `,
  title: css`
    color: ${color.text};
    ${typeRole(heading.title)}
    margin: 0;
    max-width: ${heading.titleMaxWidth};
    overflow-wrap: anywhere;
    text-wrap: balance;
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${heading.titleSizes[size]};
    `
  ),
  lede: css`
    color: ${color.textSoft};
    ${typeRole(heading.lede)}
    margin: 0;
    max-width: ${heading.ledeMaxWidth};
    text-wrap: pretty;
  `,
}));
