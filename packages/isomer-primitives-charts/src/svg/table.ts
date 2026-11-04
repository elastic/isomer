/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A table Scene as SVG, laid out as Lens's data grid: a shaded header, rows
// split by horizontal lines, an optional shaded footer, and the pager. It draws
// the first page in the Scene's starting order.

import type {
  SceneSize,
  TableAlignment,
  TableCell,
  TableColumn,
  TableScene,
} from '../scene/types';

import { type Anchor, centeredBaseline, root, text } from './parts';
import { px, textWidth } from './scale';
import { SVG_THEME } from './theme';
import { el, type SvgElement } from './tree';

const { table: theme, font } = SVG_THEME;

const ANCHOR: Record<TableAlignment, Anchor> = {
  left: 'start',
  center: 'middle',
  right: 'end',
};

/** The rows drawn on the first page, as positions into `scene.rows`. */
const firstPage = (scene: TableScene): readonly number[] =>
  scene.paging ? scene.order.slice(0, scene.paging.pageSize) : scene.order;

const hasFooter = (scene: TableScene) =>
  scene.columns.some(({ footer }) => footer !== undefined);

/** Header, body rows (or the empty message), footer and pager, in row heights. */
const contentRows = (scene: TableScene) =>
  1 +
  Math.max(firstPage(scene).length, 1) +
  (hasFooter(scene) ? 1 : 0) +
  (scene.paging ? 1 : 0);

export const tableSize = (scene: TableScene): SceneSize =>
  scene.size ?? {
    width: SVG_THEME.defaultSize.table.width,
    height: contentRows(scene) * theme.density[scene.density].rowHeight,
  };

/** Column widths: set widths kept, the rest shared, all scaled to fit. */
const columnWidths = (
  columns: readonly TableColumn[],
  width: number
): number[] => {
  const fixed = columns.reduce((sum, { width: w }) => sum + (w ?? 0), 0);
  const flexible = columns.filter(({ width: w }) => w === undefined).length;
  const share = flexible
    ? Math.max(theme.minColumnWidth, (width - fixed) / flexible)
    : 0;
  const widths = columns.map(({ width: w }) => w ?? share);
  const total = widths.reduce((sum, w) => sum + w, 0);
  return total > width ? widths.map((w) => (w * width) / total) : widths;
};

/** `value` cut to fit `width`, with an ellipsis when cut. */
const fit = (value: string, width: number, size: number) => {
  if (textWidth(value, size) <= width) {
    return { shown: value, cut: false };
  }
  const chars = Math.max(
    0,
    Math.floor(width / (size * font.widthRatio)) - theme.ellipsis.length
  );
  return { shown: `${value.slice(0, chars)}${theme.ellipsis}`, cut: true };
};

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const anchorX = ({ x, w }: Box, alignment: TableAlignment, padding: number) =>
  alignment === 'left'
    ? x + padding
    : alignment === 'center'
      ? x + w / 2
      : x + w - padding;

const drawBar = (
  bar: NonNullable<TableCell['bar']>,
  left: number,
  span: number,
  box: Box
): SvgElement => {
  const thickness = box.h * theme.barThickness;
  const top = box.y + (box.h - thickness) / 2;
  const radius = thickness / 2;
  return el(
    'g',
    { 'data-part': 'bar' },
    el('rect', {
      x: px(left),
      y: px(top),
      width: px(span),
      height: px(thickness),
      rx: px(radius),
      fill: bar.track,
    }),
    el('rect', {
      x: px(left + bar.from * span),
      y: px(top),
      width: px((bar.to - bar.from) * span),
      height: px(thickness),
      rx: px(radius),
      fill: bar.color,
    })
  );
};

const drawCell = (
  scene: TableScene,
  cell: TableCell,
  column: TableColumn,
  box: Box,
  gutterChars: number
): SvgElement => {
  const { font: size, padding } = theme.density[scene.density];
  const baseline = centeredBaseline(box.y + box.h / 2, size);
  const parts: (SvgElement | false | undefined)[] = [];
  if (cell.background) {
    parts.push(
      el('rect', {
        x: px(box.x),
        y: px(box.y),
        width: px(box.w),
        height: px(box.h),
        fill: cell.background,
      })
    );
  }

  // Lens puts a bar's value on the trailing side of a right-aligned column and
  // the leading side otherwise, hugging the bar.
  let textBox: Box = box;
  let alignment = column.alignment;
  if (cell.bar) {
    const gutter = gutterChars * size * font.widthRatio;
    const span = Math.max(0, box.w - 2 * padding - gutter - theme.barGap);
    const trailing = column.alignment === 'right';
    const left = trailing
      ? box.x + padding
      : box.x + padding + gutter + theme.barGap;
    parts.push(drawBar(cell.bar, left, span, box));
    textBox = trailing
      ? {
          ...box,
          x: box.x + box.w - gutter - 2 * padding,
          w: gutter + 2 * padding,
        }
      : { ...box, w: gutter + 2 * padding };
    alignment = trailing ? 'left' : 'right';
  }

  const inset = padding + (cell.badge ? theme.badgePadding : 0);
  const { shown, cut } = fit(cell.text, textBox.w - 2 * inset, size);
  const x = anchorX(textBox, alignment, inset);
  if (cell.badge) {
    const w = textWidth(shown, size) + 2 * theme.badgePadding;
    const h = size * font.lineHeight + theme.badgePadding;
    const start =
      alignment === 'left'
        ? x - theme.badgePadding
        : alignment === 'center'
          ? x - w / 2
          : x - w + theme.badgePadding;
    parts.push(
      el('rect', {
        x: px(start),
        y: px(box.y + (box.h - h) / 2),
        width: px(w),
        height: px(h),
        rx: theme.badgeRadius,
        fill: cell.badge,
      })
    );
  }
  const tip = cut ? cell.text : cell.title;
  parts.push(
    text(shown, {
      x,
      y: baseline,
      size,
      color: cell.color,
      anchor: ANCHOR[alignment],
    }),
    tip !== undefined && el('title', {}, tip)
  );
  return el(
    'g',
    {
      'data-row': cell.source.rows.join(' '),
      'data-column': column.id,
      'data-empty': cell.empty,
    },
    ...parts
  );
};

const rule = (y: number, width: number, color: string) =>
  el('line', {
    x1: 0,
    y1: px(y),
    x2: px(width),
    y2: px(y),
    stroke: color,
    'stroke-width': theme.lineWidth,
  });

export const drawTable = (scene: TableScene): SvgElement => {
  const size = tableSize(scene);
  const { rowHeight, font: fontSize, padding } = theme.density[scene.density];
  const widths = columnWidths(scene.columns, size.width);
  const xs = widths.map((_, index) =>
    widths.slice(0, index).reduce((sum, w) => sum + w, 0)
  );
  const footer = hasFooter(scene);
  const reserved = (1 + (footer ? 1 : 0) + (scene.paging ? 1 : 0)) * rowHeight;
  const fits = Math.max(0, Math.floor((size.height - reserved) / rowHeight));
  const shown = firstPage(scene).slice(0, fits);
  const { chrome } = scene;

  const header = el(
    'g',
    { 'data-part': 'header' },
    el('rect', {
      width: px(size.width),
      height: rowHeight,
      fill: scene.headerBackground,
    }),
    scene.columns.map((column, index) => {
      const box = { x: xs[index]!, y: 0, w: widths[index]!, h: rowHeight };
      const { shown: label, cut } = fit(
        column.label,
        box.w - 2 * padding,
        fontSize
      );
      return el(
        'g',
        { 'data-column': column.id },
        text(label, {
          x: anchorX(box, column.alignment, padding),
          y: centeredBaseline(rowHeight / 2, fontSize),
          size: fontSize,
          color: chrome.text,
          anchor: ANCHOR[column.alignment],
          weight: 'bold',
        }),
        cut && el('title', {}, column.label)
      );
    }),
    rule(rowHeight, size.width, chrome.gridLine)
  );

  const gutters = scene.columns.map((_, index) =>
    Math.max(
      theme.barLabelMinChars,
      ...shown.map(
        (position) => scene.rows[position]!.cells[index]!.text.length
      )
    )
  );

  const body =
    scene.rows.length === 0
      ? text(scene.emptyText, {
          x: size.width / 2,
          y: centeredBaseline(rowHeight * 1.5, fontSize),
          size: fontSize,
          color: chrome.textSubdued,
          anchor: 'middle',
        })
      : shown.map((position, index) => {
          const row = scene.rows[position]!;
          const y = rowHeight * (index + 1);
          return el(
            'g',
            { 'data-row': row.row, 'data-row-header': scene.rowHeader },
            row.cells.map((cell, column) =>
              drawCell(
                scene,
                cell,
                scene.columns[column]!,
                { x: xs[column]!, y, w: widths[column]!, h: rowHeight },
                gutters[column]!
              )
            ),
            rule(y + rowHeight, size.width, chrome.gridLine)
          );
        });

  const bodyRows = scene.rows.length === 0 ? 1 : shown.length;
  const footerTop = rowHeight * (1 + bodyRows);
  const footerRow =
    footer &&
    el(
      'g',
      { 'data-part': 'footer' },
      el('rect', {
        y: px(footerTop),
        width: px(size.width),
        height: rowHeight,
        fill: scene.headerBackground,
      }),
      scene.columns.map((column, index) =>
        column.footer === undefined
          ? undefined
          : text(column.footer, {
              x: anchorX(
                {
                  x: xs[index]!,
                  y: footerTop,
                  w: widths[index]!,
                  h: rowHeight,
                },
                column.alignment,
                padding
              ),
              y: centeredBaseline(footerTop + rowHeight / 2, fontSize),
              size: fontSize,
              color: chrome.text,
              anchor: ANCHOR[column.alignment],
            })
      )
    );

  const pagerTop = footerTop + (footer ? rowHeight : 0);
  const pagerY = centeredBaseline(pagerTop + rowHeight / 2, fontSize);
  const paging = scene.paging;
  const pager =
    paging &&
    el(
      'g',
      { 'data-part': 'pager' },
      text(paging.rowsPerPage, {
        x: padding,
        y: pagerY,
        size: fontSize,
        color: chrome.text,
      }),
      paging.pageLabels.map((label, page) =>
        text(label, {
          x:
            size.width -
            padding -
            (paging.pageLabels.length - 1 - page) * (fontSize + theme.pageGap),
          y: pagerY,
          size: fontSize,
          color: page === 0 ? chrome.text : chrome.textSubdued,
          anchor: 'end',
          ...(page === 0 ? { weight: 'bold' as const } : {}),
        })
      )
    );

  return root(scene, size, header, body, footerRow, pager);
};
