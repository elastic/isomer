/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { code, color } = tokens;

/** Distillate module for `slideCode`. */
export const codeModule = createStyleModule('code', ({ css }) => ({
  grid: css`
    align-items: center;
    display: grid;
    gap: ${code.panelGap};
  `,
  single: css`
    grid-template-columns: minmax(0, 1fr);
  `,
  pair: css`
    grid-template-columns: minmax(0, 1fr) ${code.arrowWidth} minmax(0, 1fr);
  `,
  figure: css`
    display: flex;
    flex-direction: column;
    margin: 0;
    min-width: 0;
  `,
  file: css`
    color: ${color.textSubtle};
    ${typeRole(code.file)}
    margin-bottom: ${code.fileGap};
  `,
  panel: css`
    background: ${color.bgSurface};
    border: ${code.border} solid ${color.border};
    border-radius: ${code.radius};
    color: ${color.text};
    display: flex;
    flex-direction: column;
    margin: 0;
    overflow: hidden;
    padding: ${code.paddingY} 0;
  `,
  regular: css`
    ${typeRole(code.text)}
  `,
  dense: css`
    ${typeRole(code.denseText)}
  `,
  // Takumi gives `code` a generic monospace family, so the line restates it.
  line: css`
    display: flex;
    font-family: ${code.text.family};
    padding-right: ${code.paddingX};
    white-space: pre;
  `,
  plain: css`
    padding-left: ${code.paddingX};
  `,
  highlight: css`
    background: ${color.primaryTint};
    border-left: ${code.highlightBar} solid ${color.primary};
    padding-left: ${code.highlightPaddingStart};
  `,
}));
