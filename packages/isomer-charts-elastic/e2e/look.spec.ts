/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer parity, look: every Scene the charts pack draws for every example,
// drawn in Chromium by the browser engine, scores within a perceptual
// tolerance of the headless engine's drawing of the same Scene, and below it
// against the headless drawing of an example established to look different.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chartsStylesheet } from '@elastic/isomer-primitives-charts';
import type {
  ColorScheme,
  Scene,
} from '@elastic/isomer-primitives-charts/scene';
import { type Browser, expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { createElasticChartsHeadlessRenderer } from '../src/headless';
import { drawExamples, type DrawnScene, SCHEMES } from '../src/parity.fixtures';

/**
 * Pictures are scored at an eighth of their size, so each 8×8 window spans
 * 64 px: a label a few pixels off, or a value drawn a little smaller, scores
 * as the same picture; a different series, value or layout does not.
 */
const SCALE = 1 / 8;

/**
 * The least SSIM a browser drawing scores against the headless drawing of its
 * Scene, by kind. Both draw from `sceneSpecs`; what remains is the engines'
 * text layout and the gaps the docs' tolerance table lists.
 */
const SAME_SCENE: Record<string, number> = {
  xy: 0.75,
  metric: 0.7,
  partition: 0.75,
  heatmap: 0.75,
  // Both engines draw a gauge's arcs and text alike, and two round gauges
  // can score 0.71 against each other, so a gauge is held closer.
  gauge: 0.9,
};

/**
 * Examples a gap in the docs' tolerance table holds to a looser tolerance:
 * where a metric title wraps, the engines break it at different words and fit
 * the value to what is left.
 */
const LOOSER: Record<string, number> = {
  'metric: Long title and subtitle': 0.5,
};

/**
 * The known-failing controls, by kind: pairs of examples whose drawings
 * differ in layout (tiles, slices, bars, marks, axes), not only in text. Each one's
 * browser drawing scores below its tolerance against the other's headless
 * drawing. Two Scenes with different data may draw alike, a metric's number
 * most of all, so other data alone is no control.
 */
const UNLIKE: Record<string, readonly (readonly [string, string])[]> = {
  metric: [
    ['metric: Single value', 'metric: Compared to the primary value'],
    [
      'metric: Single value',
      'metric: Breakdown with Other and missing buckets',
    ],
    ['metric: Single value', 'metric: Trend line'],
    ['metric: Single value', 'metric: Multivalue and date secondary'],
    [
      'metric: Long title and subtitle',
      'metric: Breakdown with Other and missing buckets',
    ],
  ],
  xy: [
    ['xyChart: Time series line', 'xyChart: Horizontal bars'],
    ['xyChart: Time series line', 'xyChart: Two y axes'],
    [
      'xyChart: Stacked bars with Other and missing buckets',
      'xyChart: Percentage areas',
    ],
    [
      'xyChart: Reference lines and annotations',
      'xyChart: Authored with palette colors',
    ],
    [
      'xyChart: Long labels and legend statistics',
      'xyChart: Stacked bars with Other and missing buckets',
    ],
  ],
  partition: [
    [
      'partitionChart: Pie',
      'partitionChart: Donut with Other and missing buckets',
    ],
    ['partitionChart: Pie', 'partitionChart: Treemap'],
    ['partitionChart: Nested pie with values', 'partitionChart: Mosaic'],
    ['partitionChart: Waffle by day', 'partitionChart: Treemap'],
    [
      'partitionChart: Several metrics',
      'partitionChart: Donut with Other and missing buckets',
    ],
  ],
  heatmap: [
    [
      'heatmap: Hourly by host',
      'heatmap: Stated bands with Other and missing buckets',
    ],
    ['heatmap: Hourly by host', 'heatmap: One row, no y'],
    ['heatmap: Percentage bands, sorted', 'heatmap: Every value the same'],
    [
      'heatmap: Selectable, brushable, pre-rendered and with provenance',
      'heatmap: Huge, tiny and missing values',
    ],
  ],
  gauge: [
    ['gauge: Semicircle with bands and a goal', 'gauge: Horizontal bullet'],
    [
      'gauge: Semicircle with bands and a goal',
      'gauge: Arc with gaps between bands',
    ],
    [
      'gauge: Vertical bullet with percentage bands',
      'gauge: Horizontal bullet',
    ],
    ['gauge: Circle, pre-rendered and with provenance', 'gauge: Huge value'],
  ],
};

/** A PNG's width and height, from its header. */
const sizeOf = (png: Buffer) => ({
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
});

const toleranceOf = ({ example, scene }: DrawnScene): number | undefined =>
  LOOSER[example] ?? SAME_SCENE[scene.kind];

const { drawn } = drawExamples([createElasticChartsHeadlessRenderer()]);

const bundle = async () => {
  const { outputFiles } = await build({
    entryPoints: [join(__dirname, 'look_page.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'error',
  });
  return outputFiles[0]!.text;
};

/**
 * Elastic Charts' stylesheet for `scheme`, and the charts pack's, which sizes
 * the headless drawing's box and colors the elements the engine draws itself.
 */
const stylesheet = (scheme: ColorScheme) =>
  `${readFileSync(
    require.resolve(`@elastic/charts/dist/theme_${scheme}.css`),
    'utf8'
  )}\n${chartsStylesheet()}`;

type LookPage = Page & {
  draw: (scene: Scene) => Promise<Buffer>;
  headless: (markup: string) => Promise<Buffer>;
  score: (a: Buffer, b: Buffer) => Promise<number>;
  pair: (
    width: number,
    height: number,
    differ: { left: number; top: number }
  ) => Promise<[Buffer, Buffer]>;
};

const openPage = async (
  browser: Browser,
  script: string,
  scheme: ColorScheme
): Promise<LookPage> => {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>${stylesheet(scheme)}
*,*::before,*::after{box-sizing:border-box}ul,ol{list-style:none}body,h1,h2,h3,h4,h5,h6,p,ul,ol,li,figure{margin:0;padding:0}#browser,#headless{position:absolute;top:0;left:0}#headless{left:2000px}</style></head>
<body><div id="browser"></div><div id="headless"></div></body></html>`
  );
  await page.addScriptTag({ content: script });
  return Object.assign(page, {
    draw: async (scene: Scene) => {
      await page.evaluate(
        (value) =>
          (
            window as unknown as { drawScene: (s: Scene) => Promise<void> }
          ).drawScene(value),
        scene
      );
      return page.locator('#browser').screenshot();
    },
    headless: async (markup: string) => {
      await page.evaluate((html) => {
        document.getElementById('headless')!.innerHTML = html;
      }, markup);
      return page.locator('#headless').screenshot();
    },
    score: (a: Buffer, b: Buffer) =>
      page.evaluate(
        ([x, y, scale]) =>
          (
            window as unknown as {
              score: (a: string, b: string, s: number) => Promise<number>;
            }
          ).score(x, y, scale),
        [a.toString('base64'), b.toString('base64'), SCALE] as const
      ),
    pair: async (
      width: number,
      height: number,
      differ: { left: number; top: number }
    ): Promise<[Buffer, Buffer]> => {
      const pngs = await page.evaluate(
        ([w, h, d]) =>
          (
            window as unknown as {
              pair: (
                w: number,
                h: number,
                d: { left: number; top: number }
              ) => [string, string];
            }
          ).pair(w, h, d),
        [width, height, differ] as const
      );
      return [Buffer.from(pngs[0], 'base64'), Buffer.from(pngs[1], 'base64')];
    },
  });
};

test.describe('renderer parity: look', () => {
  const pages = new Map<ColorScheme, LookPage>();

  test.beforeAll(async ({ browser }) => {
    const script = await bundle();
    for (const scheme of ['light', 'dark'] as const) {
      pages.set(scheme, await openPage(browser, script, scheme));
    }
  });

  test.afterAll(async () => {
    await Promise.all([...pages.values()].map((page) => page.close()));
  });

  const one = (example: string, scheme: ColorScheme) => {
    const found = drawn.filter(
      (drawing) => drawing.example === example && drawing.scheme === scheme
    );
    expect(found, `one Scene drawn for ${example}`).toHaveLength(1);
    return found[0]!;
  };

  test('scores every pixel, edges included', async () => {
    const page = pages.get('light')!;
    // At SCALE, a 300×160 picture is 38×20: whole 8×8 windows cover the
    // top-left 256×128, so these differ only outside them.
    const [same, other] = await page.pair(300, 160, { left: 256, top: 128 });
    expect(await page.score(same, same)).toBeGreaterThan(0.999);
    expect(await page.score(same, other)).toBeLessThan(
      Math.min(...Object.values(SAME_SCENE))
    );
  });

  test('has known-failing controls for every kind it scores', () => {
    for (const kind of new Set(drawn.map(({ scene }) => scene.kind))) {
      expect(UNLIKE[kind]?.length ?? 0, kind).toBeGreaterThan(0);
    }
    for (const [kind, pairs] of Object.entries(UNLIKE)) {
      for (const scheme of SCHEMES) {
        for (const example of pairs.flat()) {
          expect(one(example, scheme).scene.kind).toBe(kind);
        }
      }
    }
  });

  drawn.forEach((drawing, index) => {
    // A grid draws several charts: number them within their example.
    const nth = drawn
      .slice(0, index)
      .filter(
        ({ example, scheme }) =>
          example === drawing.example && scheme === drawing.scheme
      ).length;
    test(`${drawing.example} (${drawing.scheme}): chart ${nth + 1}, the browser ${drawing.scene.kind} looks like headless`, async () => {
      const page = pages.get(drawing.scheme)!;
      const threshold = toleranceOf(drawing);
      expect(
        threshold,
        `a look tolerance for ${drawing.scene.kind}`
      ).toBeDefined();
      const headless = await page.headless(drawing.markup);
      const browser = await page.draw(drawing.scene);
      // The score reads only where both overlap, so neither may be cut short.
      expect(sizeOf(browser)).toEqual(sizeOf(headless));
      expect(await page.score(browser, headless)).toBeGreaterThanOrEqual(
        threshold!
      );
    });
  });

  for (const pairs of Object.values(UNLIKE)) {
    for (const [a, b] of pairs) {
      for (const [mine, theirs] of [
        [a, b],
        [b, a],
      ] as const) {
        for (const scheme of SCHEMES) {
          test(`${mine} (${scheme}): the browser drawing scores below its tolerance against ${theirs}`, async () => {
            const page = pages.get(scheme)!;
            const drawing = one(mine, scheme);
            const different = one(theirs, scheme);
            const browser = await page.draw(drawing.scene);
            const unlike = await page.score(
              browser,
              await page.headless(different.markup)
            );
            expect(unlike).toBeLessThan(toleranceOf(drawing)!);
          });
        }
      }
    }
  }
});
