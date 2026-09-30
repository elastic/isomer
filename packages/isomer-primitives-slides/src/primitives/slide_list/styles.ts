/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, list } = tokens;

export const listModule = createStyleModule('list', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
  `,
  label: css`
    margin-bottom: ${list.labelGap};
  `,
  rows: css`
    border-top: ${list.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  row: css`
    align-items: baseline;
    border-bottom: ${list.rule} solid ${color.border};
    column-gap: ${list.columnGap};
    display: grid;
    grid-template-columns: ${list.termWidth} minmax(0, 1fr);
    padding: ${list.rowPadding};
  `,
  term: css`
    color: ${color.text};
    ${typeRole(list.term)}
    min-width: 0;
  `,
  body: css`
    color: ${color.textSoft};
    ${typeRole(list.body)}
    min-width: 0;
    text-wrap: pretty;
  `,
  /** A row with no term spans both columns. */
  wide: css`
    grid-column: 1 / -1;
  `,
  plainRows: css`
    display: flex;
    flex-direction: column;
    gap: ${list.plainGap};
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  plainRow: css`
    color: ${color.textSoft};
    ${typeRole(list.plainBody)}
    text-wrap: pretty;
  `,
  footnote: css`
    color: ${color.textSoft};
    ${typeRole(list.footnote)}
    margin: ${list.footnoteGap} 0 0;
    text-wrap: pretty;
  `,
}));
