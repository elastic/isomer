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
const { color, delta } = tokens;

/** Distillate module for `slideDelta`. */
export const deltaModule = createStyleModule('delta', ({ css }) => ({
  root: css`
    align-items: end;
    column-gap: ${delta.columnGap};
    display: grid;
    grid-template-columns: auto ${delta.arrowWidth} auto minmax(
        ${delta.noteMinWidth},
        1fr
      );
  `,
  side: css`
    display: flex;
    flex-direction: column;
    gap: ${delta.labelGap};
  `,
  label: css`
    color: ${color.textSubtle};
    ${typeRole(delta.label)}
    text-transform: uppercase;
  `,
  labelAfter: css`
    color: ${color.primary};
  `,
  value: css`
    color: ${color.text};
    ${typeRole(delta.value)}
    white-space: nowrap;
  `,
  valueAfter: css`
    color: ${color.primary};
  `,
  valueSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${delta.valueSizes[size]};
    `
  ),
  placeholder: css`
    flex: 0 0 auto;
    width: ${delta.placeholderWidth};
  `,
  placeholderHeight: variants(
    slideSizes,
    (size) => css`
      height: ${delta.placeholderHeights[size]};
    `
  ),
  arrowLift: variants(
    slideSizes,
    (size) => css`
      margin-bottom: ${delta.arrowLifts[size]};
    `
  ),
  note: css`
    border-left: ${delta.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    gap: ${delta.noteGap};
    margin-bottom: ${delta.noteBottom};
    padding-left: ${delta.notePadding};
  `,
  change: css`
    color: ${color.text};
    ${typeRole(delta.change)}
  `,
  body: css`
    color: ${color.textSoft};
    ${typeRole(delta.body)}
    margin: 0;
    text-wrap: pretty;
  `,
}));
