/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The page `look.spec.ts` bundles: draws a Scene with the browser engine, and
// scores two pictures of it against each other.

import { createRoot, type Root } from 'react-dom/client';
import type { Scene } from '@elastic/isomer-primitives-charts/scene';

import { createElasticChartsRenderer } from '../src/renderer';

const renderer = createElasticChartsRenderer();
let root: Root | undefined;

/** Draws `scene` into `#browser` at its size, and resolves once Elastic Charts reports it rendered. */
const drawScene = async (scene: Scene): Promise<void> => {
  const host = document.getElementById('browser')!;
  root?.unmount();
  host.style.width = `${scene.size!.width}px`;
  host.style.height = `${scene.size!.height}px`;
  root = createRoot(host);
  root.render(renderer.render(scene, { environment: 'browser' }) as never);
  const deadline = performance.now() + 10_000;
  while (!host.querySelector('[data-ech-render-complete="true"]')) {
    if (performance.now() >= deadline) {
      throw new Error(
        `Elastic Charts did not report rendering the ${scene.kind} Scene within 10 s`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  // Elastic Charts paints the canvas on the frame after it reports.
  await new Promise((resolve) => requestAnimationFrame(resolve));
};

/** The picture's luminance, `scale` times its size. */
const luminance = async (png: string, scale: number) => {
  const image = new Image();
  image.src = `data:image/png;base64,${png}`;
  await image.decode();
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const out = new Float64Array(width * height);
  for (let at = 0; at < out.length; at += 1) {
    out[at] =
      0.2126 * data[at * 4]! +
      0.7152 * data[at * 4 + 1]! +
      0.0722 * data[at * 4 + 2]!;
  }
  return { width, height, out };
};

const WINDOW = 8;
const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

/**
 * The mean structural similarity (SSIM) of two pictures' luminance over 8×8
 * windows, after scaling both to `scale`: 1 when identical, near 0 when
 * unrelated. Scaling down first discounts sub-pixel text and anti-aliasing.
 * Windows at the right and bottom edges are as wide and tall as what is left,
 * and each window counts by its pixels, so every pixel is scored once.
 */
const score = async (a: string, b: string, scale = 0.5): Promise<number> => {
  const [x, y] = await Promise.all([luminance(a, scale), luminance(b, scale)]);
  const width = Math.min(x.width, y.width);
  const height = Math.min(x.height, y.height);
  let total = 0;
  let pixels = 0;
  for (let top = 0; top < height; top += WINDOW) {
    for (let left = 0; left < width; left += WINDOW) {
      const bottom = Math.min(top + WINDOW, height);
      const right = Math.min(left + WINDOW, width);
      let sx = 0;
      let sy = 0;
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      for (let row = top; row < bottom; row += 1) {
        for (let column = left; column < right; column += 1) {
          const p = x.out[row * x.width + column]!;
          const q = y.out[row * y.width + column]!;
          sx += p;
          sy += q;
          sxx += p * p;
          syy += q * q;
          sxy += p * q;
        }
      }
      const n = (bottom - top) * (right - left);
      const mx = sx / n;
      const my = sy / n;
      const vx = sxx / n - mx * mx;
      const vy = syy / n - my * my;
      const cxy = sxy / n - mx * my;
      total +=
        (n * ((2 * mx * my + C1) * (2 * cxy + C2))) /
        ((mx * mx + my * my + C1) * (vx + vy + C2));
      pixels += n;
    }
  }
  return pixels === 0 ? 0 : total / pixels;
};

/**
 * Two `width`×`height` PNGs, the same striped picture except where `differ`
 * picks a pixel: there one is white and the other black.
 */
const pair = (
  width: number,
  height: number,
  differ: { left: number; top: number }
): [string, string] => {
  const draw = (other: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    for (let column = 0; column < width; column += 1) {
      context.fillStyle = column % 16 < 8 ? '#fff' : '#444';
      context.fillRect(column, 0, 1, height);
    }
    context.fillStyle = other ? '#000' : '#fff';
    context.fillRect(differ.left, 0, width - differ.left, height);
    context.fillRect(0, differ.top, width, height - differ.top);
    return canvas.toDataURL('image/png').split(',')[1]!;
  };
  return [draw(false), draw(true)];
};

Object.assign(window, { drawScene, score, pair });
