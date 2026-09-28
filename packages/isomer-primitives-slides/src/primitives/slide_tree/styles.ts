/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, tree } = tokens;

/** Distillate module for `slideTree`. */
export const treeModule = createStyleModule('tree', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
  `,
  folder: css`
    color: ${color.text};
    ${typeRole(tree.root)}
    margin-bottom: ${tree.rootGap};
  `,
  entries: css`
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  row: css`
    align-items: baseline;
    column-gap: ${tree.columnGap};
    display: grid;
    grid-template-columns: ${tree.nameWidth} minmax(0, 1fr);
    padding: ${tree.rowPadding};
    position: relative;
  `,
  /** A `├` rail: the full row, so it meets the next row's. */
  rail: css`
    border-left: ${tree.connector} solid ${color.line};
    bottom: 0;
    left: ${tree.railInset};
    position: absolute;
    top: 0;
  `,
  name: css`
    color: ${color.text};
    display: flex;
    ${typeRole(tree.name)}
    min-width: 0;
    padding-left: ${tree.nameIndent};
    position: relative;
    white-space: pre;
  `,
  /** A `└` rail: from the row's top edge to the tick. */
  railLast: css`
    border-left: ${tree.connector} solid ${color.line};
    bottom: 50%;
    left: ${tree.railInset};
    position: absolute;
    top: -${tree.rowPaddingY};
  `,
  tick: css`
    border-top: ${tree.connector} solid ${color.line};
    left: ${tree.railInset};
    position: absolute;
    top: 50%;
    width: ${tree.tickWidth};
  `,
  body: css`
    color: ${color.textSoft};
    ${typeRole(tree.body)}
    min-width: 0;
    text-wrap: pretty;
  `,
}));
