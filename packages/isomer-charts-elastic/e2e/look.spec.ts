/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer parity, look: every Scene the charts pack draws for every example,
// drawn in Chromium by the browser engine, scores within a perceptual
// tolerance of the headless engine's drawing of the same Scene, and below it
// against a different Scene.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ColorScheme,
  Scene,
} from '@elastic/isomer-primitives-charts/scene';
import { type Browser, expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

import { createElasticChartsHeadlessRenderer } from '../src/headless';
import { drawExamples, type DrawnScene } from '../src/parity.fixtures';

/**
 * Pictures are scored at an eighth of their size, so each 8×8 window spans
 * 64 px: a label a few pixels off, or a value drawn a little smaller, scores
 * as the same picture; a different series, value or layout does not.
 */
const SCALE = 1 / 8;

/**
 * The least SSIM a browser drawing scores against the headless drawing of its
 * Scene, by kind. Both draw from `sceneSpecs`; what remains is the engines'
 * text layout and the gaps the docs' tolerance table lists. Every drawing of
 * other data scores below it.
 */
const SAME_SCENE: Record<string, number> = { xy: 0.75, metric: 0.75 };

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

const stylesheet = (scheme: ColorScheme) =>
  readFileSync(
    require.resolve(`@elastic/charts/dist/theme_${scheme}.css`),
    'utf8'
  );

type LookPage = Page & {
  draw: (scene: Scene) => Promise<Buffer>;
  headless: (markup: string, scene: Scene) => Promise<Buffer>;
  score: (a: Buffer, b: Buffer) => Promise<number>;
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
    headless: async (markup: string, scene: Scene) => {
      await page.evaluate(
        ([html, width, height]) => {
          const host = document.getElementById('headless')!;
          host.innerHTML = html;
          host.style.width = `${width}px`;
          host.style.height = `${height}px`;
        },
        [markup, scene.size!.width, scene.size!.height] as const
      );
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

  /** The Scenes of the same kind and scheme with other data, for the known-failing scores. */
  const others = (drawing: DrawnScene) =>
    drawn.filter(
      ({ scene, scheme, example }) =>
        scheme === drawing.scheme &&
        scene.kind === drawing.scene.kind &&
        example !== drawing.example &&
        JSON.stringify(scene.table) !== JSON.stringify(drawing.scene.table)
    );

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
      const threshold = SAME_SCENE[drawing.scene.kind];
      expect(
        threshold,
        `a look tolerance for ${drawing.scene.kind}`
      ).toBeDefined();
      const headless = await page.headless(drawing.markup, drawing.scene);
      const browser = await page.draw(drawing.scene);
      expect(await page.score(browser, headless)).toBeGreaterThanOrEqual(
        threshold!
      );
      // Known-failing: the headless drawing of any other data scores below.
      for (const different of others(drawing)) {
        const unlike = await page.score(
          browser,
          await page.headless(different.markup, different.scene)
        );
        expect(unlike, different.example).toBeLessThan(threshold!);
      }
    });
  });
});
