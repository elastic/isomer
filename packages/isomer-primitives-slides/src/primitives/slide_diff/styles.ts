/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { slideDiffOps } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { code, color, diff } = tokens;

/** What `slideDiff` adds to `slideCode`'s panel: the gutter, the change bands, and the marker. */
export const diffModule = createStyleModule('diff', ({ css }) => ({
  // Takumi gives `code` a generic monospace family, so the line restates it.
  line: css`
    display: grid;
    font-family: ${code.text.family};
    grid-template-columns: ${diff.gutter} minmax(0, 1fr);
    padding-right: ${code.paddingX};
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
  // The line's band and marker draw the change; `ins` and `del` only tell assistive technology.
  change: css`
    text-decoration: none;
  `,
}));
