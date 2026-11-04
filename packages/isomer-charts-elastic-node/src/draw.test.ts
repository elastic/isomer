/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Draws in this test's own thread: `createSceneDraw` installs a jsdom window
// as the thread's globals, and Vitest gives each test file its own.

import {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';

import { createSceneDraw, type SceneDraw } from './draw';

interface DrawnAxis {
  labels: string[];
  values: unknown[];
}
interface DrawnState {
  axes: { x: DrawnAxis[]; y: DrawnAxis[] };
  legend?: { items: { name: string; color: string }[] };
}

let draw: SceneDraw;

beforeAll(async () => {
  draw = await createSceneDraw({ pixelRatio: 1 });
});

const images = (html: string): string[] =>
  [...html.matchAll(/src="data:image\/png;base64,([^"]+)"/g)].map(
    ([, data]) => data!
  );

describe('createSceneDraw', () => {
  it('draws an xy Scene to images of its canvases', async () => {
    const drawing = draw(xyInteractiveScene);
    expect(drawing).toMatchObject({ width: 480, height: 240 });
    expect(drawing.html).not.toContain('<canvas');
    const pngs = images(drawing.html);
    expect(pngs.length).toBeGreaterThan(0);
    // The plot, beside the legend, is drawn in the Scene's series colors.
    const image = await loadImage(Buffer.from(pngs[0]!, 'base64'));
    expect(image.width).toBeGreaterThan(0);
    expect(image.width).toBeLessThanOrEqual(480);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const colors = new Set<string>();
    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] === 255) {
        colors.add(
          `#${[data[at]!, data[at + 1]!, data[at + 2]!]
            .map((channel) => channel.toString(16).padStart(2, '0'))
            .join('')}`.toUpperCase()
        );
      }
    }
    for (const { color } of xyInteractiveScene.series.filter(({ marks }) =>
      marks.some(({ y, y0 }) => (y ?? 0) - (y0 ?? 0) >= 9)
    )) {
      expect(colors).toContain(color.toUpperCase());
    }
  });

  it('reports the DebugState of what it drew, with the Scene’s strings and colors', () => {
    const state = draw(xyInteractiveScene, { debugState: true })
      .debugState as DrawnState;
    const shown = state.axes.x[0]!.labels.filter((label) => label !== '');
    expect(shown.length).toBeGreaterThan(0);
    const sceneLabels = xyInteractiveScene.categories.map(({ label }) => label);
    for (const label of shown) {
      expect(sceneLabels).toContain(label);
    }
    expect(state.legend?.items).toEqual(
      xyInteractiveScene.legend.items.map(({ label, color }) => ({
        key: expect.any(String) as string,
        name: label,
        color,
      }))
    );
  });

  it('draws at a requested size', () => {
    const drawing = draw(xyTimeSeriesScene, { width: 320, height: 160 });
    expect(drawing).toMatchObject({ width: 320, height: 160 });
    expect(drawing.html).toContain('width: 320px');
  });

  it('draws a metric as markup with the Scene’s text', () => {
    const drawing = draw(metricSingleValueScene);
    const [tile] = metricSingleValueScene.tiles;
    expect(drawing.html).toContain(tile!.title);
    expect(drawing.html).toContain(tile!.value.text);
  });

  it('hands over the stylesheet for the Scene’s scheme, under EUI’s reset', () => {
    const light = draw(xyTimeSeriesScene).stylesheet;
    const dark = draw({ ...xyTimeSeriesScene, scheme: 'dark' }).stylesheet;
    expect(light).toContain(':where(.echChart)');
    expect(light).toContain('.echChart');
    expect(dark).not.toBe(light);
    expect(light).not.toContain('min-content');
  });

  it('refuses a Scene without a size', () => {
    const { size: _size, ...unsized } = xyTimeSeriesScene;
    expect(() => draw(unsized)).toThrow(/needs a size/);
  });
});
