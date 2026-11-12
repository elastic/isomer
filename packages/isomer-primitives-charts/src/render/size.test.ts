/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { metricSingleValueScene, xyTimeSeriesScene } from '../scene/examples';
import { resolveChart } from '../scene/resolve';
import type { MetricScene, XyScene } from '../scene/types';
import { gaugeExamples } from '../schema/examples/gauge';

import { chartSize, chartSizeSpec, chartSizeVars } from './size';
import { CHARTS_THEME } from './theme';

const { chart } = CHARTS_THEME;

const horizontal: XyScene = { ...xyTimeSeriesScene, orientation: 'horizontal' };
const ordinal: XyScene = {
  ...xyTimeSeriesScene,
  axes: {
    ...xyTimeSeriesScene.axes,
    x: { ...xyTimeSeriesScene.axes.x, scale: 'ordinal' },
  },
};
const semiCircle = resolveChart(gaugeExamples[0]!.node, {
  scheme: 'light',
});
const [tile] = metricSingleValueScene.tiles;
const sixTiles: MetricScene = {
  ...metricSingleValueScene,
  tiles: Array.from({ length: 6 }, () => tile!),
  layout: { ...metricSingleValueScene.layout, columns: 3, rows: 2 },
};

describe('chartSizeSpec', () => {
  it('gives a vertical time chart 16:9 with a least height, as Lens does', () => {
    expect(xyTimeSeriesScene.axes.x.scale).toBe('time');
    expect(chartSizeSpec(xyTimeSeriesScene)).toEqual({
      aspectRatio: { x: 16, y: 9 },
      minHeight: 300,
    });
  });

  it.each([
    ['horizontal', horizontal],
    ['ordinal', ordinal],
  ])('gives any other xy chart 16:9 with no least height (%s)', (_, scene) => {
    expect(chartSizeSpec(scene)).toEqual({ aspectRatio: { x: 16, y: 9 } });
  });

  it("gives one metric tile Lens's single-tile box as its largest", () => {
    expect(chartSizeSpec(metricSingleValueScene)).toEqual({
      aspectRatio: { x: 300, y: 160 },
      maxWidth: 300,
    });
  });

  it('gives several metric tiles a square side each, in their grid', () => {
    expect(chartSizeSpec(sixTiles)).toEqual({
      aspectRatio: { x: 3, y: 2 },
      maxWidth: 3 * 200,
    });
  });
});

describe('chartSize', () => {
  it('takes the theme width on Node', () => {
    expect(chart.width).toBe(480);
    // 480 × 9/16 = 270, under the least height of 300.
    expect(chartSize(chartSizeSpec(xyTimeSeriesScene)!)).toEqual({
      width: 480,
      height: 300,
    });
    expect(chartSize(chartSizeSpec(ordinal)!)).toEqual({
      width: 480,
      height: 270,
    });
  });

  it('keeps the ratio past the least height at a wider width', () => {
    expect(chartSize(chartSizeSpec(xyTimeSeriesScene)!, 960)).toEqual({
      width: 960,
      height: 540,
    });
  });

  // Lens's `useGaugeSizeByType`, at the theme width and past each largest box.
  it.each([
    ['horizontalBullet', [480, 160], [600, 200]],
    ['verticalBullet', [400, 600], [400, 600]],
    ['semiCircle', [480, 300], [600, 375]],
    ['arc', [480, 436], [600, 545]],
    ['circle', [480, 480], [600, 600]],
  ] as const)(
    'sizes a %s gauge by its shape',
    (shape, [width, height], wide) => {
      const spec = chartSizeSpec({ ...semiCircle, shape })!;
      expect(chartSize(spec)).toEqual({ width, height });
      expect(chartSize(spec, 960)).toEqual({ width: wide[0], height: wide[1] });
    }
  );

  it('stops at the largest width', () => {
    expect(chartSize(chartSizeSpec(metricSingleValueScene)!)).toEqual({
      width: 300,
      height: 160,
    });
    // 480 × 2/3 = 320 at the theme width; 600 × 2/3 = 400 at its largest.
    expect(chartSize(chartSizeSpec(sixTiles)!)).toEqual({
      width: 480,
      height: 320,
    });
    expect(chartSize(chartSizeSpec(sixTiles)!, 960)).toEqual({
      width: 600,
      height: 400,
    });
  });
});

describe('chartSizeVars', () => {
  it('fills the width at the ratio, within the bounds', () => {
    expect(chartSizeVars(chartSizeSpec(xyTimeSeriesScene)!)).toEqual({
      aspectRatio: '16 / 9',
      minHeight: '300px',
    });
    expect(chartSizeVars(chartSizeSpec(metricSingleValueScene)!)).toEqual({
      aspectRatio: '300 / 160',
      maxWidth: '300px',
    });
  });
});
