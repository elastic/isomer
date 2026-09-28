/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import {
  slideMatrixColumnCounts,
  type SlideMatrixMark,
  slideMatrixMarks,
  slideSizes,
} from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, matrix } = tokens;

/** Distillate module for `slideMatrix`. */
export const matrixModule = createStyleModule('matrix', ({ css }) => {
  // `none` is a dash, subtle unless its column is highlighted.
  const markCss = (kind: SlideMatrixMark, ink: typeof color.text) =>
    kind === 'full'
      ? css`
          background: ${ink};
          border-radius: 50%;
        `
      : kind === 'partial'
        ? css`
            background: linear-gradient(90deg, ${ink} 50%, transparent 50%);
            border: ${matrix.ring} solid ${ink};
            border-radius: 50%;
          `
        : css`
            background: ${ink === color.text ? color.textSubtle : ink};
            height: ${matrix.dashHeight};
            width: ${matrix.dashWidth};
          `;
  return {
    root: css`
      display: flex;
      flex-direction: column;
    `,
    // Rows stretch their cells, so a highlighted column's band fills each row.
    row: css`
      align-items: stretch;
      display: grid;
    `,
    columns: variants(
      slideMatrixColumnCounts,
      (count) => css`
        grid-template-columns: ${matrix.labelWidth} repeat(
            ${slideMatrixColumnCounts.indexOf(count) + 2},
            minmax(0, 1fr)
          );
      `
    ),
    head: css`
      border-bottom: ${matrix.headRule} solid ${color.text};
    `,
    // Every heading leaves room for the band, so they stay level whichever is highlighted.
    heading: css`
      color: ${color.text};
      ${typeRole(matrix.head)}
      padding: ${matrix.bandTop} 0 ${matrix.headPaddingBottom};
      text-align: center;
    `,
    body: css`
      border-bottom: ${matrix.rowRule} solid ${color.border};
    `,
    cellPadding: variants(
      slideSizes,
      (size) => css`
        padding: ${matrix.rowPaddings[size]} 0;
      `
    ),
    label: css`
      align-self: center;
      color: ${color.text};
      ${typeRole(matrix.label)}
    `,
    cell: css`
      align-items: center;
      display: flex;
      justify-content: center;
    `,
    band: css`
      background: ${color.primaryBg};
    `,
    mark: css`
      box-sizing: border-box;
      flex: 0 0 auto;
    `,
    size: css`
      height: ${matrix.markSize};
      width: ${matrix.markSize};
    `,
    legendSize: css`
      height: ${matrix.legendMarkSize};
      width: ${matrix.legendMarkSize};
    `,
    kind: variants(slideMatrixMarks, (kind) => markCss(kind, color.text)),
    highlightedKind: variants(slideMatrixMarks, (kind) =>
      markCss(kind, color.primary)
    ),
    highlightedHeading: css`
      background: ${color.primaryBg};
      border-radius: ${matrix.bandRadius} ${matrix.bandRadius} 0 0;
      color: ${color.primary};
    `,
    legend: css`
      color: ${color.textSoft};
      display: flex;
      gap: ${matrix.legendGap};
      ${typeRole(matrix.legend)}
      margin-top: ${matrix.legendTop};
    `,
    legendItem: css`
      align-items: center;
      display: flex;
      gap: ${matrix.legendItemGap};
    `,
  };
});
