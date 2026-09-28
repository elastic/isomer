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
const { color, roadmap } = tokens;

/** Distillate module for `slideRoadmap`. */
export const roadmapModule = createStyleModule('roadmap', ({ css }) => ({
  list: css`
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  column: css`
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-width: 0;
  `,
  /** Every column after the first: a rule on its left. */
  ruled: css`
    border-left: ${roadmap.rule} solid ${color.border};
    padding-left: ${roadmap.columnPadding};
  `,
  /** Every column before the last: room before the next rule. */
  gutter: css`
    padding-right: ${roadmap.columnPadding};
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${roadmap.titleSizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(roadmap.title)}
    margin: 0;
  `,
  titleCurrent: css`
    color: ${color.primary};
  `,
  status: css`
    margin-top: ${roadmap.statusGap};
  `,
  itemsSize: variants(
    slideSizes,
    (size) => css`
      margin-top: ${roadmap.itemsGaps[size]};
    `
  ),
  items: css`
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  item: css`
    border-top: ${roadmap.itemRule} solid ${color.border};
    display: flex;
    flex-direction: column;
    gap: ${roadmap.itemGap};
  `,
  itemSize: variants(
    slideSizes,
    (size) => css`
      padding: ${roadmap.itemPaddings[size]} 0;
    `
  ),
  itemTitleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${roadmap.itemTitleSizes[size]};
    `
  ),
  itemTitle: css`
    color: ${color.text};
    ${typeRole(roadmap.itemTitle)}
  `,
  itemBodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${roadmap.itemBodySizes[size]};
    `
  ),
  itemBody: css`
    color: ${color.textSoft};
    ${typeRole(roadmap.itemBody)}
    text-wrap: pretty;
  `,
}));
