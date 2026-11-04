/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A drawing is markup for the `snapshot` surface: takumi must lay it out and
// rasterize it with the chart in it.

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import {
  metricSingleValueScene,
  xyInteractiveScene,
} from '@elastic/isomer-primitives-charts/scene';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';

import { createSceneDraw, type SceneDraw } from './draw';

let draw: SceneDraw;
const backend = createTakumiImageBackend();

beforeAll(async () => {
  draw = await createSceneDraw({ pixelRatio: 1 });
});

const colorsIn = async (png: Buffer): Promise<Set<string>> => {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height);
  const colors = new Set<string>();
  for (let at = 0; at < data.length; at += 4) {
    colors.add(
      `#${[data[at]!, data[at + 1]!, data[at + 2]!]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase()
    );
  }
  return colors;
};

describe('takumi rasterizes a drawing', () => {
  it('xy: the bars come through in the Scene’s series colors', async () => {
    const { html, stylesheet, width, height } = draw(xyInteractiveScene);
    const png = await backend.png({ html, css: stylesheet, width, height });
    const colors = await colorsIn(png);
    for (const key of ['200', '404']) {
      const series = xyInteractiveScene.series.find(
        (entry) => entry.key === key
      )!;
      expect(colors).toContain(series.color.toUpperCase());
    }
  });

  it('metric: the tile lays out', async () => {
    const { html, stylesheet, width, height } = draw(metricSingleValueScene);
    const png = await backend.png({ html, css: stylesheet, width, height });
    const image = await loadImage(png);
    expect([image.width, image.height]).toEqual([width, height]);
    expect((await colorsIn(png)).size).toBeGreaterThan(2);
  });
});
