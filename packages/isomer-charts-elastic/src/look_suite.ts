/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The look check every static drawing with Elastic Charts runs in Chromium:
// this engine's browser drawing of each Scene scores a mean SSIM, at an eighth
// of their size, of at least a tolerance against the static drawing of the
// same Scene, and below it against the static drawing of a Scene established
// to look different. Playwright's `test` and `expect` are passed in, so no
// package entry imports Playwright.

import type {
  ColorScheme,
  Scene,
  SceneKind,
} from '@elastic/isomer-primitives-charts/scene';

/** A static drawing of one example's Scene, as the charts pack's `drawExamples` records it. */
export interface LookDrawing {
  readonly example: string;
  readonly scheme: ColorScheme;
  readonly scene: Scene;
  readonly markup: string;
}

/**
 * Pictures are scored at an eighth of their size, so each 8×8 window spans
 * 64 px: a label a few pixels off, or a value drawn a little smaller, scores
 * as the same picture; a different series, value or layout does not.
 */
export const LOOK_SCALE = 1 / 8;

/** The Playwright page methods the suite calls. */
interface LookBrowserPage {
  setContent: (html: string) => Promise<unknown>;
  addScriptTag: (options: { content: string }) => Promise<unknown>;
  evaluate: <R, A>(fn: (arg: A) => R | Promise<R>, arg: A) => Promise<R>;
  locator: (selector: string) => { screenshot: () => Promise<Buffer> };
  close: () => Promise<void>;
}

interface LookBrowser {
  newPage: (options: { deviceScaleFactor: number }) => Promise<LookBrowserPage>;
}

/** The parts of Playwright's `test` the suite uses. */
export interface LookTest {
  (title: string, body: () => Promise<void> | void): void;
  describe: (title: string, body: () => void) => void;
  beforeAll: (
    body: (fixtures: { browser: LookBrowser }) => Promise<void>
  ) => void;
  afterAll: (body: () => Promise<void>) => void;
}

/** The parts of Playwright's `expect` the suite uses. */
export type LookExpect = (
  value: unknown,
  message?: string
) => {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeDefined: () => void;
  toHaveLength: (length: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
};

export interface LookSuite {
  readonly test: LookTest;
  readonly expect: LookExpect;
  /** Every Scene the static engine drew, from `drawExamples`. */
  readonly drawn: readonly LookDrawing[];
  /** The page script: a bundle that calls `installLookPage()`. */
  readonly script: () => Promise<string>;
  /** The CSS the page draws both pictures with, in a scheme. */
  readonly stylesheet: (scheme: ColorScheme) => string;
  /** The least SSIM a browser drawing scores against the static drawing of its Scene, by kind. */
  readonly sameScene: Partial<Record<SceneKind, number>>;
  /** Examples a documented gap holds to a looser tolerance. */
  readonly looser?: Readonly<Record<string, number>>;
  /**
   * The known-failing controls, by kind: pairs of examples whose drawings
   * differ in layout (tiles, slices, bars, marks, axes), not only in text. Two
   * Scenes with different data may draw alike, a metric's number most of all,
   * so other data alone is no control.
   */
  readonly unlike: Partial<
    Record<SceneKind, readonly (readonly [string, string])[]>
  >;
  /** Called with each score the suite measures, for an engine to record. */
  readonly onScore?: (score: LookScore) => void;
}

/** One score the suite measured: a drawing of `example` against its own Scene's, or another's. */
export interface LookScore {
  readonly example: string;
  readonly scheme: ColorScheme;
  readonly kind: SceneKind;
  readonly against: string;
  readonly score: number;
  readonly tolerance: number;
}

/** A PNG's width and height, from its header. */
const sizeOf = (png: Buffer) => ({
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
});

interface LookPage {
  draw: (scene: Scene) => Promise<Buffer>;
  drawing: (markup: string) => Promise<Buffer>;
  score: (a: Buffer, b: Buffer) => Promise<number>;
  pair: (
    width: number,
    height: number,
    differ: { left: number; top: number }
  ) => Promise<[Buffer, Buffer]>;
  close: () => Promise<void>;
}

const RESET =
  '*,*::before,*::after{box-sizing:border-box}ul,ol{list-style:none}body,h1,h2,h3,h4,h5,h6,p,ul,ol,li,figure{margin:0;padding:0}#browser,#static{position:absolute;top:0;left:0}#static{left:2000px}';

type PageWindow = {
  drawScene: (scene: Scene) => Promise<void>;
  score: (a: string, b: string, scale: number) => Promise<number>;
  pair: (
    width: number,
    height: number,
    differ: { left: number; top: number }
  ) => [string, string];
};

const openPage = async (
  browser: LookBrowser,
  script: string,
  stylesheet: string
): Promise<LookPage> => {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><html><head><style>${stylesheet}\n${RESET}</style></head><body><div id="browser"></div><div id="static"></div></body></html>`
  );
  await page.addScriptTag({ content: script });
  return {
    draw: async (scene) => {
      await page.evaluate(
        (value) => (window as unknown as PageWindow).drawScene(value),
        scene
      );
      return page.locator('#browser').screenshot();
    },
    drawing: async (markup) => {
      await page.evaluate((html) => {
        document.getElementById('static')!.innerHTML = html;
      }, markup);
      return page.locator('#static').screenshot();
    },
    score: (a, b) =>
      page.evaluate(
        ([x, y, scale]) => (window as unknown as PageWindow).score(x, y, scale),
        [a.toString('base64'), b.toString('base64'), LOOK_SCALE] as const
      ),
    pair: async (width, height, differ) => {
      const pngs = await page.evaluate(
        ([w, h, d]) => (window as unknown as PageWindow).pair(w, h, d),
        [width, height, differ] as const
      );
      return [Buffer.from(pngs[0], 'base64'), Buffer.from(pngs[1], 'base64')];
    },
    close: () => page.close(),
  };
};

/** Declares the look check's tests for one static engine. */
export const defineLookSuite = ({
  test,
  expect,
  drawn,
  script,
  stylesheet,
  sameScene,
  looser = {},
  unlike,
  onScore,
}: LookSuite): void => {
  const toleranceOf = ({ example, scene }: LookDrawing): number | undefined =>
    looser[example] ?? sameScene[scene.kind];
  const schemes = [...new Set(drawn.map(({ scheme }) => scheme))];

  test.describe('renderer parity: look', () => {
    const pages = new Map<ColorScheme, LookPage>();

    test.beforeAll(async ({ browser }) => {
      const content = await script();
      for (const scheme of schemes) {
        pages.set(scheme, await openPage(browser, content, stylesheet(scheme)));
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
      const page = pages.get(schemes[0]!)!;
      // At LOOK_SCALE, a 300×160 picture is 38×20: whole 8×8 windows cover
      // the top-left 256×128, so these differ only outside them.
      const [same, other] = await page.pair(300, 160, { left: 256, top: 128 });
      expect(await page.score(same, same)).toBeGreaterThan(0.999);
      expect(await page.score(same, other)).toBeLessThan(
        Math.min(...Object.values(sameScene))
      );
    });

    test('has known-failing controls for every kind it scores', () => {
      for (const kind of new Set(drawn.map(({ scene }) => scene.kind))) {
        expect(unlike[kind]?.length ?? 0, kind).toBeGreaterThan(0);
      }
      for (const [kind, pairs] of Object.entries(unlike)) {
        for (const scheme of schemes) {
          for (const example of (pairs ?? []).flat()) {
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
      test(`${drawing.example} (${drawing.scheme}): chart ${nth + 1}, the browser ${drawing.scene.kind} looks like the static one`, async () => {
        const page = pages.get(drawing.scheme)!;
        const threshold = toleranceOf(drawing);
        expect(
          threshold,
          `a look tolerance for ${drawing.scene.kind}`
        ).toBeDefined();
        const drawnStatic = await page.drawing(drawing.markup);
        const browser = await page.draw(drawing.scene);
        // The score reads only where both overlap, so neither may be cut short.
        expect(sizeOf(browser)).toEqual(sizeOf(drawnStatic));
        const score = await page.score(browser, drawnStatic);
        onScore?.({
          example: drawing.example,
          scheme: drawing.scheme,
          kind: drawing.scene.kind,
          against: drawing.example,
          score,
          tolerance: threshold!,
        });
        expect(score).toBeGreaterThanOrEqual(threshold!);
      });
    });

    for (const pairs of Object.values(unlike)) {
      for (const [a, b] of pairs ?? []) {
        for (const [mine, theirs] of [
          [a, b],
          [b, a],
        ] as const) {
          for (const scheme of schemes) {
            test(`${mine} (${scheme}): the browser drawing scores below its tolerance against ${theirs}`, async () => {
              const page = pages.get(scheme)!;
              const drawing = one(mine, scheme);
              const browser = await page.draw(drawing.scene);
              const score = await page.score(
                browser,
                await page.drawing(one(theirs, scheme).markup)
              );
              onScore?.({
                example: mine,
                scheme,
                kind: drawing.scene.kind,
                against: theirs,
                score,
                tolerance: toleranceOf(drawing)!,
              });
              expect(score).toBeLessThan(toleranceOf(drawing)!);
            });
          }
        }
      }
    }
  });
};
