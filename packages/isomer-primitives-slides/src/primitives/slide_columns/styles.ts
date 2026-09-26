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
const { color, columns } = tokens;

/** Distillate module for `slideColumns`. */
export const columnsModule = createStyleModule('columns', ({ css }) => ({
  list: css`
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: ${columns.gap};
    min-width: 0;
  `,
  // With a highlight, every column keeps room for the bar, so titles stay level.
  barred: css`
    border-top: ${columns.highlightBar} solid transparent;
    padding-top: ${columns.highlightGap};
  `,
  highlighted: css`
    border-top-color: ${color.primary};
  `,
  /** Every column after the first: a rule on its left. */
  ruled: css`
    border-left: ${columns.rule} solid ${color.border};
    padding-left: ${columns.columnPadding};
  `,
  /** Every column before the last: room before the next rule. */
  gutter: css`
    padding-right: ${columns.columnPadding};
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${columns.titleSizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(columns.title)}
    margin: 0;
  `,
  titleHighlighted: css`
    color: ${color.primary};
  `,
  head: css`
    display: flex;
    flex-direction: column;
    gap: ${columns.gap};
  `,
  tags: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${columns.tagGap};
  `,
  tag: css`
    background: ${color.bgSurface};
    border: ${columns.tagBorder} solid ${color.border};
    border-radius: ${columns.tagRadius};
    color: ${color.text};
    display: flex;
    ${typeRole(columns.tag)}
    padding: ${columns.tagPadding};
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${columns.bodySizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(columns.body)}
    margin: 0;
    text-wrap: pretty;
  `,
  footnote: css`
    align-items: baseline;
    border-top: ${columns.rule} solid ${color.border};
    color: ${color.textSoft};
    display: flex;
    gap: ${columns.footnoteGap};
    ${typeRole(columns.footnote)}
    margin: ${columns.footnoteMargin} 0 0;
    padding-top: ${columns.footnotePadding};
  `,
  footnoteCode: css`
    color: ${color.text};
    flex: 0 0 auto;
    font-family: ${columns.footnoteCode.family};
    font-weight: ${columns.footnoteCode.weight};
  `,
}));
