/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideDiffOps } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, diff } = tokens;

/** Distillate module for `slideDiff`. */
export const diffModule = createStyleModule('diff', ({ css }) => ({
  figure: css`
    display: flex;
    flex-direction: column;
    margin: 0;
    min-width: 0;
  `,
  file: css`
    color: ${color.textSubtle};
    ${typeRole(diff.file)}
    margin-bottom: ${diff.fileGap};
  `,
  panel: css`
    background: ${color.bgSurface};
    border: ${diff.border} solid ${color.border};
    border-radius: ${diff.radius};
    color: ${color.text};
    display: flex;
    flex-direction: column;
    margin: 0;
    overflow: hidden;
    padding: ${diff.paddingY} 0;
  `,
  regular: css`
    ${typeRole(diff.text)}
  `,
  dense: css`
    ${typeRole(diff.denseText)}
  `,
  // Takumi gives `code` a generic monospace family, so the line restates it.
  line: css`
    display: grid;
    font-family: ${diff.text.family};
    min-height: ${diff.text.lineHeight?.value ?? '1'}em;
    grid-template-columns: ${diff.gutter} minmax(0, 1fr);
    padding-right: ${diff.paddingEnd};
    white-space: pre;
  `,
  op: variants(slideDiffOps, (op) =>
    op === 'add'
      ? css`
          background: ${color.primaryTint};
          box-shadow: inset ${diff.bar} 0 0 ${color.primary};
        `
      : css`
          background: ${color.bgMuted};
          color: ${color.textSoft};
        `
  ),
  marker: css`
    text-align: center;
  `,
  markerOp: variants(slideDiffOps, (op) =>
    op === 'add'
      ? css`
          color: ${color.primary};
          font-weight: ${diff.markerWeight};
        `
      : css`
          color: ${color.textSubtle};
        `
  ),
}));
