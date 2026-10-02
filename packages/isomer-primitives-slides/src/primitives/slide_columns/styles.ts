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
    min-width: 0;
  `,
  content: css`
    display: flex;
    flex-direction: column;
    gap: ${columns.gap};
  `,
  // Every column draws the bar when one is highlighted, so titles stay level.
  bar: css`
    flex: 0 0 auto;
    height: ${columns.highlightBar};
    margin-bottom: ${columns.highlightGap};
  `,
  barOn: css`
    background: ${color.primary};
  `,
  ruled: css`
    border-left: ${columns.rule} solid ${color.border};
    padding-left: ${columns.columnPadding};
  `,
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
