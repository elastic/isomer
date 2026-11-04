/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every schema example, resolved to a Scene, drawn in jsdom and Skia, and
// rasterized by takumi at the drawing's size.

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import {
  type ColorScheme,
  resolveChart,
} from '@elastic/isomer-primitives-charts/scene';
import {
  metricExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { loadImage } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';

import { createSceneDraw, type SceneDraw } from './draw';

interface DrawnSeries {
  name: string;
  color: string;
}
interface DrawnState {
  bars?: DrawnSeries[];
  lines?: DrawnSeries[];
  areas?: DrawnSeries[];
}

let draw: SceneDraw;
const backend = createTakumiImageBackend();

beforeAll(async () => {
  draw = await createSceneDraw({ pixelRatio: 1 });
});

const SIZE = { width: 480, height: 240 };
const SCHEMES: ColorScheme[] = ['light', 'dark'];

const cases = SCHEMES.flatMap((scheme) =>
  [...metricExamples, ...xyChartExamples].map(({ name, node }) => ({
    name: `${name} (${scheme})`,
    scene: resolveChart(node, { scheme, size: SIZE }),
  }))
);

describe('resolved examples drawn in Node', () => {
  it.each(cases)('$name', async ({ scene }) => {
    const drawing = draw(scene, { debugState: true });
    if (scene.kind === 'xy') {
      const state = drawing.debugState as DrawnState;
      const drawn = [
        ...(state.bars ?? []),
        ...(state.lines ?? []),
        ...(state.areas ?? []),
      ].map(({ name, color }) => ({ name, color }));
      expect(drawn).toHaveLength(scene.series.length);
      expect(drawn).toEqual(
        expect.arrayContaining(
          scene.series.map(({ label, color }) => ({ name: label, color }))
        )
      );
    } else {
      for (const tile of scene.tiles) {
        expect(drawing.html).toContain(tile.value.text);
      }
    }
    const png = await backend.png({
      html: drawing.html,
      css: drawing.stylesheet,
      width: drawing.width,
      height: drawing.height,
    });
    const image = await loadImage(png);
    expect([image.width, image.height]).toEqual([SIZE.width, SIZE.height]);
  });
});
