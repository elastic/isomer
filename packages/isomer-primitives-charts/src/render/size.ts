/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// How a chart sizes itself when nothing sizes it: Lens's chart size specs
// (`ChartSizeSpec` in Kibana's chart expressions), with every length from
// `CHARTS_THEME.chart`. A browser applies a spec as CSS; Node, which has no
// container to fill, turns it into a box at the theme's width.

import type { Scene, SceneSize } from '../scene/types';

import { CHARTS_THEME } from './theme';

/** A chart's shape outside a sized container. */
export interface ChartSizeSpec {
  /** Width to height. */
  readonly aspectRatio: { readonly x: number; readonly y: number };
  /** The least height, in pixels. */
  readonly minHeight?: number;
  /** The greatest width, in pixels. */
  readonly maxWidth?: number;
}

const { chart } = CHARTS_THEME;

/** The size spec of a Scene's kind; none for a kind that sizes itself, such as a table. */
export const chartSizeSpec = (scene: Scene): ChartSizeSpec | undefined => {
  switch (scene.kind) {
    case 'xy':
      return scene.axes.x.scale === 'time' && scene.orientation === 'vertical'
        ? {
            aspectRatio: chart.xy.aspectRatio,
            minHeight: chart.xy.timeMinHeight,
          }
        : { aspectRatio: chart.xy.aspectRatio };
    case 'partition':
      return { aspectRatio: chart.partition.aspectRatio };
    case 'heatmap':
      return { aspectRatio: chart.heatmap.aspectRatio };
    case 'metric': {
      if (scene.tiles.length <= 1) {
        const { width, height } = chart.metric.single;
        return { aspectRatio: { x: width, y: height }, maxWidth: width };
      }
      const { columns, rows } = scene.layout;
      return {
        aspectRatio: { x: columns, y: rows },
        maxWidth: columns * chart.metric.tileSide,
      };
    }
    default:
      return undefined;
  }
};

/** The box a spec takes at `width`. */
export const chartSize = (
  { aspectRatio, minHeight = 0, maxWidth = Infinity }: ChartSizeSpec,
  width: number = chart.width
): SceneSize => {
  const fitted = Math.min(width, maxWidth);
  return {
    width: fitted,
    height: Math.max(
      Math.round((fitted * aspectRatio.y) / aspectRatio.x),
      minHeight
    ),
  };
};

/** A spec as the values of the `chartsScene` size vars, for the box a browser draws the chart in. */
export const chartSizeVars = ({
  aspectRatio,
  minHeight,
  maxWidth,
}: ChartSizeSpec) => ({
  aspectRatio: `${aspectRatio.x} / ${aspectRatio.y}`,
  ...(minHeight === undefined ? {} : { minHeight: `${minHeight}px` }),
  ...(maxWidth === undefined ? {} : { maxWidth: `${maxWidth}px` }),
});
