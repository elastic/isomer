/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { bulletList, color } = tokens;

/** Distillate module for `slideBulletList`. */
export const bulletsModule = createStyleModule('bullets', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
  `,
  label: css`
    margin-bottom: ${bulletList.labelGap};
  `,
  list: css`
    border-top: ${bulletList.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    border-bottom: ${bulletList.rule} solid ${color.border};
    color: ${color.text};
    display: flex;
    gap: ${bulletList.markerGap};
    ${typeRole(bulletList.item)}
    padding: ${bulletList.rowPadding};
  `,
  text: css`
    flex: 1;
    min-width: 0;
    text-wrap: pretty;
  `,
  marker: css`
    align-items: center;
    display: flex;
    flex: 0 0 auto;
    height: ${bulletList.markerHeight};
    justify-content: center;
    width: ${bulletList.markerWidth};
  `,
  dot: css`
    background: ${color.primary};
    border-radius: 50%;
    height: ${bulletList.dotSize};
    width: ${bulletList.dotSize};
  `,
  check: css`
    border-bottom: ${bulletList.checkStroke} solid ${color.primary};
    border-right: ${bulletList.checkStroke} solid ${color.primary};
    box-sizing: border-box;
    height: ${bulletList.checkHeight};
    transform: rotate(${bulletList.checkAngle});
    width: ${bulletList.checkWidth};
  `,
  cross: css`
    color: ${color.textSubtle};
    font-weight: ${tokens.font.weight.bold};
  `,
}));
