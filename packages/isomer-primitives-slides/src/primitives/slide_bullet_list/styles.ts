/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { bullets, color } = tokens;

/** Distillate module for `slideBulletList`. */
export const bulletsModule = createStyleModule('bullets', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
  `,
  label: css`
    margin-bottom: ${bullets.labelGap};
  `,
  list: css`
    border-top: ${bullets.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    border-bottom: ${bullets.rule} solid ${color.border};
    color: ${color.text};
    display: flex;
    gap: ${bullets.markerGap};
    ${typeRole(bullets.item)}
    padding: ${bullets.rowPadding};
  `,
  text: css`
    flex: 1;
    min-width: 0;
    text-wrap: pretty;
  `,
  marker: css`
    align-items: center;
    display: flex;
    flex: none;
    height: ${bullets.markerHeight};
    justify-content: center;
    width: ${bullets.markerWidth};
  `,
  dot: css`
    background: ${color.primary};
    border-radius: 50%;
    height: ${bullets.dotSize};
    width: ${bullets.dotSize};
  `,
  check: css`
    border-bottom: ${bullets.checkStroke} solid ${color.primary};
    border-right: ${bullets.checkStroke} solid ${color.primary};
    box-sizing: border-box;
    height: ${bullets.checkHeight};
    transform: rotate(${bullets.checkAngle});
    width: ${bullets.checkWidth};
  `,
  cross: css`
    color: ${color.textSubtle};
    font-weight: ${tokens.font.weight.bold};
  `,
}));
