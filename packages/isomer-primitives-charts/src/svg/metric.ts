/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MetricAlignment,
  MetricScene,
  MetricTile,
  SceneSize,
} from '../scene/types';

import { type Anchor, root, text } from './parts';
import { px, textWidth } from './scale';
import { SVG_THEME } from './theme';
import { el, type SvgElement } from './tree';

const { metric: theme, font } = SVG_THEME;

const ANCHOR: Record<MetricAlignment, Anchor> = {
  left: 'start',
  center: 'middle',
  right: 'end',
};

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Space at the left a vertical progress bar takes. */
  readonly inset: number;
}

const anchorX = (box: Box, alignment: MetricAlignment) =>
  alignment === 'left'
    ? box.x + box.inset + theme.padding
    : alignment === 'center'
      ? box.x + (box.inset + box.w) / 2
      : box.x + box.w - theme.padding;

const secondaryText = (secondary: NonNullable<MetricTile['secondary']>) => {
  const glyph =
    secondary.badge?.showIcon && secondary.badge.direction
      ? theme.badgeGlyph[secondary.badge.direction]
      : '';
  const value = glyph ? `${glyph} ${secondary.text}` : secondary.text;
  if (!secondary.label || secondary.labelPlacement === 'tooltip') {
    return { label: undefined, value };
  }
  return { label: secondary.label, value };
};

const drawTrend = (
  trend: NonNullable<MetricTile['trend']>,
  box: Box
): SvgElement => {
  const height = box.h * theme.trendHeight;
  const bottom = box.y + box.h;
  const [x0, x1] = trend.xDomain;
  const [y0, y1] = trend.yDomain;
  const sx = (x: number) => box.x + ((x - x0) / (x1 - x0 || 1)) * box.w;
  const sy = (y: number) => bottom - ((y - y0) / (y1 - y0 || 1)) * height;
  const points = trend.points.filter(
    (point): point is { x: number; y: number } => point.y !== null
  );
  if (points.length === 0) {
    return el('g', { 'data-part': 'trend' });
  }
  const line = points
    .map(
      ({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${px(sx(x))},${px(sy(y))}`
    )
    .join('');
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return el(
    'g',
    { 'data-part': 'trend' },
    el('path', {
      d: `${line}L${px(sx(last.x))},${px(bottom)}L${px(sx(first.x))},${px(bottom)}Z`,
      fill: trend.color,
      'fill-opacity': theme.trendAreaOpacity,
      stroke: 'none',
    }),
    el('path', {
      d: line,
      fill: 'none',
      stroke: trend.color,
      'stroke-width': SVG_THEME.xy.lineWidth,
    })
  );
};

const drawProgress = (
  progress: NonNullable<MetricTile['progress']>,
  box: Box
): SvgElement => {
  const t = theme.progressThickness;
  const fraction = Math.min(1, Math.max(0, progress.fraction));
  const [track, bar] =
    progress.orientation === 'horizontal'
      ? [
          { x: box.x, y: box.y + box.h - t, width: box.w, height: t },
          {
            x: box.x,
            y: box.y + box.h - t,
            width: box.w * fraction,
            height: t,
          },
        ]
      : [
          { x: box.x, y: box.y, width: t, height: box.h },
          {
            x: box.x,
            y: box.y + box.h * (1 - fraction),
            width: t,
            height: box.h * fraction,
          },
        ];
  const rect = (r: typeof track, fill: string) =>
    el('rect', {
      x: px(r.x),
      y: px(r.y),
      width: px(r.width),
      height: px(r.height),
      fill,
    });
  return el(
    'g',
    { 'data-part': 'progress' },
    rect(track, progress.track),
    rect(bar, progress.color)
  );
};

const valueSize = (scene: MetricScene, tile: MetricTile, box: Box) => {
  const available = box.w - box.inset - 2 * theme.padding;
  const byWidth = available / (tile.value.text.length * font.widthRatio || 1);
  const byHeight = (box.h - 2 * theme.padding) * 0.45;
  return Math.max(
    theme.valueMin,
    Math.min(theme.valueMax[scene.layout.valueSizing], byWidth, byHeight)
  );
};

const drawTile = (
  scene: MetricScene,
  tile: MetricTile,
  cell: Omit<Box, 'inset'>,
  bordered: boolean,
  index: number
): SvgElement => {
  const emphasisRows = new Set(
    scene.interactions.emphasis.flatMap(({ rows }) => rows)
  );
  const emphasized = tile.source.rows.some((row) => emphasisRows.has(row));
  const box: Box = {
    ...cell,
    inset:
      tile.progress?.orientation === 'vertical' ? theme.progressThickness : 0,
  };
  const { layout, chrome } = scene;
  const labelAnchor = ANCHOR[layout.labelsAlignment];
  const titleY = box.y + theme.padding + theme.title;
  const subtitleY = titleY + theme.subtitle * font.lineHeight;
  const size = valueSize(scene, tile, box);
  const secondary = tile.secondary && secondaryText(tile.secondary);
  const secondaryHeight = secondary ? theme.secondary * font.lineHeight : 0;
  const reserveBottom =
    tile.progress?.orientation === 'horizontal' ? theme.progressThickness : 0;
  const top = (tile.subtitle ? subtitleY : titleY) + size;
  const bottom =
    box.y + box.h - theme.padding - reserveBottom - secondaryHeight;
  const valueY =
    layout.valuePosition === 'top'
      ? top
      : layout.valuePosition === 'middle'
        ? (top + bottom) / 2
        : bottom;
  const secondaryAnchor = ANCHOR[layout.secondaryAlignment];
  const secondaryX = anchorX(box, layout.secondaryAlignment);
  const secondaryY = box.y + box.h - theme.padding - reserveBottom;
  // The label reads in subdued text; the value, with its badge, in its own color.
  const valueWidth = textWidth(secondary?.value ?? '', theme.secondary);
  const labelWidth = secondary?.label
    ? textWidth(`${secondary.label} `, theme.secondary)
    : 0;
  const lineWidth = valueWidth + labelWidth;
  const lineStart =
    secondaryAnchor === 'start'
      ? secondaryX
      : secondaryAnchor === 'middle'
        ? secondaryX - lineWidth / 2
        : secondaryX - lineWidth;
  const labelFirst = tile.secondary?.labelPlacement !== 'after';
  const valueX = labelFirst ? lineStart + labelWidth : lineStart;
  const labelX = labelFirst
    ? lineStart
    : lineStart +
      valueWidth +
      labelWidth -
      textWidth(secondary?.label ?? '', theme.secondary);
  return el(
    'g',
    { 'data-tile': tile.source.rows.join(' '), 'data-hit': `t:${index}` },
    el('rect', {
      x: px(box.x),
      y: px(box.y),
      width: px(box.w),
      height: px(box.h),
      fill: tile.background,
      stroke: emphasized ? chrome.text : bordered ? chrome.border : undefined,
      'stroke-width': emphasized
        ? SVG_THEME.xy.emphasisStroke
        : bordered
          ? theme.borderWidth
          : undefined,
    }),
    tile.trend && drawTrend(tile.trend, box),
    tile.progress && drawProgress(tile.progress, box),
    text(tile.title, {
      x: anchorX(box, layout.labelsAlignment),
      y: titleY,
      size: theme.title,
      color: chrome.text,
      anchor: labelAnchor,
      weight: 'bold',
    }),
    tile.subtitle &&
      text(tile.subtitle, {
        x: anchorX(box, layout.labelsAlignment),
        y: subtitleY,
        size: theme.subtitle,
        color: chrome.textSubdued,
        anchor: labelAnchor,
      }),
    text(tile.value.text, {
      x: anchorX(box, layout.valueAlignment),
      y: valueY,
      size,
      color: tile.value.color,
      anchor: ANCHOR[layout.valueAlignment],
      weight: 'bold',
    }),
    tile.secondary?.badge &&
      el('rect', {
        x: px(valueX - theme.badgePadding),
        y: px(secondaryY - theme.secondary - theme.badgePadding / 2),
        width: px(valueWidth + 2 * theme.badgePadding),
        height: px(theme.secondary + theme.badgePadding * 2),
        rx: theme.badgeRadius,
        fill: tile.secondary.badge.color,
      }),
    secondary?.label &&
      text(secondary.label, {
        x: labelX,
        y: secondaryY,
        size: theme.secondary,
        color: chrome.textSubdued,
      }),
    secondary &&
      text(secondary.value, {
        x: valueX,
        y: secondaryY,
        size: theme.secondary,
        color: tile.secondary.color,
      })
  );
};

/** The size a metric Scene draws at. */
export const metricSize = (scene: MetricScene): SceneSize =>
  scene.size ?? {
    width: SVG_THEME.defaultSize.metric.width * scene.layout.columns,
    height: SVG_THEME.defaultSize.metric.height * scene.layout.rows,
  };

export const drawMetric = (scene: MetricScene): SvgElement => {
  const size = metricSize(scene);
  const { columns, rows } = scene.layout;
  const w = size.width / Math.max(columns, 1);
  const h = size.height / Math.max(rows, 1);
  const bordered = scene.tiles.length > 1;
  return root(
    scene,
    size,
    scene.tiles.map((tile, index) =>
      drawTile(
        scene,
        tile,
        {
          x: (index % columns) * w + (bordered ? theme.gap / 2 : 0),
          y: Math.floor(index / columns) * h + (bordered ? theme.gap / 2 : 0),
          w: w - (bordered ? theme.gap : 0),
          h: h - (bordered ? theme.gap : 0),
        },
        bordered,
        index
      )
    )
  );
};
