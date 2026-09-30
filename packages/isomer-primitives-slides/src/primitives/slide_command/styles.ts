/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decls, rule, variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

import { COPY_BUTTON_ATTRIBUTE } from './copy';

const { createStyleModule, tokens } = slideDistillery;
const { color, command, marks } = tokens;
const { copy } = command;

export const commandModule = createStyleModule('command', ({ css }) => ({
  // Centers like `layout.fill`; consecutive commands center as one group.
  root: css`
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: ${command.labelGap};
    margin-top: auto;
    min-width: 0;

    & + & {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: auto;
    }
  `,
  panel: css`
    align-items: center;
    background: ${color.bgSurface};
    border: ${command.border} solid ${color.border};
    border-radius: ${command.radius};
    box-sizing: border-box;
    color: ${color.text};
    display: flex;
    ${typeRole(command.text)}
    gap: ${command.gap};
    padding: ${command.paddingY} ${command.paddingX};
  `,
  // The `slideCopy` script adds the button, so it is styled by `COPY_BUTTON_ATTRIBUTE`.
  copyButton: rule(
    (h) => `${h.panel} > [${COPY_BUTTON_ATTRIBUTE}]`,
    decls`
      background: transparent;
      border: ${copy.border} solid ${color.borderDashed};
      border-radius: ${copy.radius};
      color: ${color.textSubtle};
      cursor: pointer;
      display: flex;
      flex: 0 0 auto;
      font-family: inherit;
      font-size: ${copy.size};
      line-height: inherit;
      margin: 0;
      padding: ${copy.paddingY} ${copy.paddingX};
    `
  ),
  textSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${command.textSizes[size]};
    `
  ),
  prompt: css`
    color: ${color.textSubtle};
    flex: 0 0 auto;
  `,
  line: css`
    flex: 1;
    font-family: ${command.text.family};
    min-width: 0;
    overflow: hidden;
    white-space: pre;
  `,
  // Bold as well as `primary`, like strong in regular copy; the mono face keeps its advance at every weight.
  highlight: css`
    background: none;
    color: ${color.primary};
    font-weight: ${marks.strong.weight};
  `,
}));
