/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { StaticServer } from './serve_static';
import { serveStatic } from './serve_static';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');

/** Overridable so the packed-consumer check can drive its own install and config. */
const CLI = process.env.STUDIO_CLI ?? join(packageDir, 'bin/isomer-studio.js');
const CONFIG =
  process.env.STUDIO_CONFIG ??
  join(repoRoot, 'packages/isomer-primitives-slides/isomer-studio.config.ts');
const BASE = process.env.STUDIO_BASE ?? '/sub/path/';
const PREBUILT_SITE = process.env.STUDIO_SITE;
const EDIT_ROUTE = process.env.STUDIO_EDIT_ROUTE ?? '#/dev/slideHeading/0';
const APP_ID = process.env.STUDIO_APP_ID ?? 'decks';
const APP_TITLE = process.env.STUDIO_APP_TITLE ?? 'Decks';
/** A page the app lists in the nav, as `title` and `path`, and the heading it shows if one is known, when it has one. */
const APP_PAGE: { title: string; path: string; heading?: string } | undefined =
  process.env.STUDIO_CONFIG
    ? process.env.STUDIO_APP_PAGE_TITLE && process.env.STUDIO_APP_PAGE_PATH
      ? {
          title: process.env.STUDIO_APP_PAGE_TITLE,
          path: process.env.STUDIO_APP_PAGE_PATH,
        }
      : undefined
    : undefined;
/** A font family the app's global CSS loads with `url()`, when it has one. */
const APP_FONT = process.env.STUDIO_APP_FONT;
/** The name of a button in the app that opens an EUI popover, when it has one. */
const APP_POPOVER = process.env.STUDIO_APP_POPOVER;
/** The test id of an app element whose Emotion `css` prop sets `color: rgb(1, 2, 3)`, when it has one. */
const APP_EMOTION = process.env.STUDIO_APP_EMOTION;
const SKIP_DEV = process.env.STUDIO_DEV === '0';

const EDITED_TEXT = 'Edited by the smoke test';

const runCli = (args: readonly string[]): Promise<string> =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolvePromise(output)
        : reject(
            new Error(
              `isomer-studio ${args.join(' ')} exited ${code}:\n${output}`
            )
          )
    );
  });

const startDev = (
  config = CONFIG
): Promise<{ url: string; child: ChildProcess }> =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [CLI, 'dev', '--port', '0', '--config', config],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let output = '';
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const [, url] = /Isomer Studio: (http\S+)/.exec(output) ?? [];
      if (url) {
        resolvePromise({ url, child });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) =>
      reject(new Error(`isomer-studio dev exited ${code}:\n${output}`))
    );
  });

/** Every failed response, console error and uncaught error on `page`. */
const watchProblems = (page: Page): string[] => {
  const problems: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(
        `${response.status()} ${response.request().method()} ${response.url()}`
      );
    }
  });
  page.on('console', (message) => {
    // Playwright's trace recorder tries to script the HTML surface's sandboxed frame.
    const isTraceRecorder = message
      .text()
      .startsWith("Blocked script execution in 'about:srcdoc'");
    if (message.type() === 'error' && !isTraceRecorder) {
      problems.push(`console error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) =>
    problems.push(`page error: ${error.message}`)
  );
  return problems;
};

const editor = (page: Page) => page.locator('.monaco-editor').first();

const expectMonacoReady = async (page: Page) => {
  await expect(editor(page)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.fonts).some(
          ({ family, status }) =>
            family.replace(/"/g, '') === 'codicon' && status === 'loaded'
        )
      )
    )
    .toBe(true);
};

const expectSlackStyled = async (page: Page) => {
  const slack = page.getByRole('region', { name: 'Slack preview' });
  await expect(slack).toBeVisible();
  const styled = await slack.evaluate((section) => {
    const sheet = Array.from(document.styleSheets).find(({ href }) =>
      href?.endsWith('/slack.css')
    );
    if (!sheet) {
      return 0;
    }
    const selectors = Array.from(sheet.cssRules).flatMap((rule) =>
      rule instanceof CSSStyleRule ? [rule.selectorText] : []
    );
    return Array.from(section.querySelectorAll('*')).filter((element) =>
      selectors.some((selector) => {
        try {
          return element.matches(selector);
        } catch {
          return false;
        }
      })
    ).length;
  });
  expect(
    styled,
    'elements in the Slack preview that slack.css styles'
  ).toBeGreaterThan(0);
};

const pngPreview = (page: Page) =>
  page.getByRole('img', { name: 'PNG preview' });

const expectPngLoaded = async (page: Page) => {
  await expect(pngPreview(page)).toBeVisible();
  await expect
    .poll(() =>
      pngPreview(page).evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0);
};

/**
 * Rewrites the first string literal in the editor, which every example of the edited primitive has.
 * The source goes back on one line so Monaco's soft wrap and auto-indent can't change it.
 */
const editFirstString = async (page: Page) => {
  const source = (await editor(page).locator('.view-lines').innerText())
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><');
  const edited = source.replace(/"[^"]*"/, JSON.stringify(EDITED_TEXT));
  expect(edited).not.toBe(source);
  await editor(page).locator('.view-lines').click();
  await expect(async () => {
    // The Desktop Chrome device reports Windows, so Monaco binds select-all to Control on every host.
    await page.keyboard.press('Control+A');
    await expect(editor(page).locator('.selected-text').first()).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.keyboard.insertText(edited);
};

const reactPreview = (page: Page) =>
  page.getByRole('region', { name: 'React preview' });

/** Opens the app from Home and then one of its pages from the nav, deep-links a sub-path through a reload, and checks its styles and `Preview`. */
const exerciseApp = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'What are we rendering today?',
    })
  ).toBeVisible();
  await page
    .getByRole('link', { name: new RegExp(`^${APP_TITLE}\\b`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`#/app/${APP_ID}/$`));
  await page.goto(`${url}#/dev`);
  await page.getByRole('button', { name: APP_TITLE, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/app/${APP_ID}/$`));

  if (APP_PAGE) {
    const entry = page
      .getByRole('list', { name: `${APP_TITLE} pages` })
      .getByRole('button', { name: APP_PAGE.title, exact: true });
    await entry.click();
    await expect(page).toHaveURL(
      new RegExp(`#/app/${APP_ID}/${APP_PAGE.path}$`)
    );
    await expect(entry).toHaveAttribute('aria-current', 'page');
    if (APP_PAGE.heading) {
      await expect(
        page.locator('main').getByRole('heading', {
          name: APP_PAGE.heading,
          exact: true,
        })
      ).toBeVisible();
    }
  }

  await page.goto(`${url}#/app/${APP_ID}/a/b`);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`#/app/${APP_ID}/a/b$`));
  const main = page.locator('main').first();

  await expect
    .poll(
      () =>
        main.evaluate(
          (element) =>
            Array.from(element.querySelectorAll('*')).filter(
              (node) => (node.shadowRoot?.textContent ?? '').trim().length > 0
            ).length
        ),
      { message: 'Preview hosts with rendered output in a shadow root' }
    )
    .toBeGreaterThan(0);

  const styled = await main.evaluate((element) => {
    const selectors = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).flatMap((rule) =>
          rule instanceof CSSStyleRule &&
          /^\.[\w-]+$/.test(rule.selectorText) &&
          !rule.selectorText.startsWith('.css-') &&
          !rule.selectorText.startsWith('.eui')
            ? [rule.selectorText]
            : []
        );
      } catch {
        return [];
      }
    });
    return Array.from(element.querySelectorAll('[class]')).filter((node) =>
      selectors.some((selector) => node.matches(selector))
    ).length;
  });
  expect(styled, "elements the app's own stylesheets style").toBeGreaterThan(0);

  if (APP_FONT) {
    await expect
      .poll(() =>
        page.evaluate(
          (family) =>
            Array.from(document.fonts).some(
              (font) =>
                font.family.replace(/"/g, '') === family &&
                font.status === 'loaded'
            ),
          APP_FONT
        )
      )
      .toBe(true);
  }
  if (APP_EMOTION) {
    await expect(page.getByTestId(APP_EMOTION)).toHaveCSS(
      'color',
      'rgb(1, 2, 3)'
    );
  }
  if (APP_POPOVER) {
    await page.getByRole('button', { name: APP_POPOVER }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
};

let builtSite: Promise<string> | undefined;
let builtSiteDir: string | undefined;

/** One `build` of {@link CONFIG}, shared by every group that serves it statically. */
const buildSite = (): Promise<string> => {
  if (PREBUILT_SITE !== undefined) {
    return Promise.resolve(PREBUILT_SITE);
  }
  builtSite ??= (async () => {
    builtSiteDir = mkdtempSync(join(tmpdir(), 'isomer-studio-site-'));
    const dir = join(builtSiteDir, 'site');
    await runCli(['build', '--config', CONFIG, '--out', dir, '--base', BASE]);
    return dir;
  })();
  return builtSite;
};

test.afterAll(() => {
  if (builtSiteDir) {
    rmSync(builtSiteDir, { recursive: true, force: true });
  }
});

test.describe('static build', () => {
  let site: StaticServer;

  test.beforeAll(async () => {
    site = await serveStatic(await buildSite(), BASE);
  });

  test.afterAll(async () => {
    await site.close();
  });

  test('serves the Studio from a sub-path with no failed requests', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const pngRequests: string[] = [];
    page.on('response', (response) => {
      if (/\/png\/[0-9a-f]{64}\.png$/.test(response.url()) && response.ok()) {
        pngRequests.push(response.url());
      }
    });

    await page.goto(`${site.url}${EDIT_ROUTE}`);
    await expectMonacoReady(page);
    await expectSlackStyled(page);
    await expectPngLoaded(page);
    expect(
      pngRequests.length,
      'PNGs fetched from the manifest'
    ).toBeGreaterThan(0);

    const [lightPng] = pngRequests;
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect.poll(() => pngRequests.length).toBeGreaterThan(1);
    expect(pngRequests.at(-1)).not.toBe(lightPng);
    await expectPngLoaded(page);

    const wasm = page.waitForResponse((response) =>
      response.url().endsWith('/assets/esbuild.wasm')
    );
    await editFirstString(page);
    expect((await wasm).ok()).toBe(true);
    await expect(reactPreview(page)).toContainText(EDITED_TEXT);
    await expect(
      page.getByText('PNG previews of edited compositions need').first()
    ).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('serves apps, their chunks and their CSS from the sub-path', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await exerciseApp(page, site.url);
    expect(problems).toEqual([]);
  });

  for (const width of [320, 390, 768, 900, 901, 1043, 1399, 1400, 1920]) {
    test(`keeps Home's surface chart readable at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(site.url);
      const section = page.getByRole('region', {
        name: 'One composition, every surface',
      });
      await expect(section).toBeVisible();
      await expect(
        section.getByRole('heading', {
          level: 2,
          name: 'Author once, render anywhere.',
        })
      ).toBeVisible();
      const layout = await section.evaluate((element) => {
        const body = element.lastElementChild!;
        const [blurb, chart] = Array.from(body.children);
        const blurbBox = blurb!.getBoundingClientRect();
        const chartBox = chart!.getBoundingClientRect();
        const items = Array.from(
          chart!.querySelectorAll<HTMLElement>('[tabindex="0"]')
        );
        const boxes = items.map((item) => item.getBoundingClientRect());
        const overlaps = (a: DOMRect, b: DOMRect) =>
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top;
        return {
          copyOverlapsChart: overlaps(blurbBox, chartBox),
          itemsOverlap: boxes.some((box, index) =>
            boxes.slice(index + 1).some((other) => overlaps(box, other))
          ),
          itemsFit: boxes.every(
            (box) =>
              box.left >= chartBox.left - 1 && box.right <= chartBox.right + 1
          ),
          labelSizes: items
            .slice(1)
            .map((item) => parseFloat(getComputedStyle(item).fontSize)),
          connectedCards: Array.from(
            chart!.querySelectorAll('svg[data-surface-connections]')
          ).some((svg) => {
            if (getComputedStyle(svg).display === 'none') {
              return false;
            }
            return (
              svg.querySelectorAll('path').length === items.length - 1 ||
              svg.querySelectorAll('line').length === items.length + 1
            );
          }),
          wrappedEndpointsMatch: Array.from(
            chart!.querySelectorAll<SVGPathElement>(
              'svg[data-surface-connections="wrapped"] > path'
            )
          ).every((path, index) => {
            if (getComputedStyle(path.ownerSVGElement!).display === 'none') {
              return true;
            }
            const svgBox = path.ownerSVGElement!.getBoundingClientRect();
            const endpoint = path.getPointAtLength(path.getTotalLength());
            const box = boxes[index + 1]!;
            return (
              Math.abs(svgBox.left + endpoint.x - box.left - box.width / 2) <
                1 && Math.abs(svgBox.top + endpoint.y - box.top) < 1
            );
          }),
          overflows: element.scrollWidth > element.clientWidth,
        };
      });
      expect(layout.copyOverlapsChart).toBe(false);
      expect(layout.itemsOverlap).toBe(false);
      expect(layout.itemsFit).toBe(true);
      expect(layout.connectedCards).toBe(true);
      expect(layout.wrappedEndpointsMatch).toBe(true);
      expect(layout.overflows).toBe(false);
      expect(layout.labelSizes.length).toBeGreaterThan(0);
      expect(layout.labelSizes.every((size) => size >= 11)).toBe(true);
      const tiles = await page
        .getByRole('region', { name: 'Featured primitives', exact: true })
        .evaluate((featured) => {
          const content = featured.parentElement!;
          const narrow = content.clientWidth < 620;
          const groups = [
            featured,
            content.querySelector(
              'section[aria-labelledby="isomer-studio-applications"]'
            )!,
            content.querySelector(
              'section[aria-labelledby="isomer-studio-learn"]'
            )!,
          ];
          return {
            narrow,
            stacked: groups.every((group) => {
              const boxes = Array.from(group.lastElementChild!.children)
                .map((child) => child.getBoundingClientRect())
                .filter((box) => box.width > 0 && box.height > 0);
              return boxes.every(
                (box, index) =>
                  index === 0 || box.top >= boxes[index - 1]!.bottom - 1
              );
            }),
            pagerVisible:
              getComputedStyle(featured.querySelector('button')!.parentElement!)
                .display !== 'none',
          };
        });
      expect(tiles.stacked).toBe(tiles.narrow);
      expect(tiles.pagerVisible).toBe(true);
      const firstTile = page.getByTestId('featured-primitive').first();
      await firstTile.getByRole('link', { name: 'Docs →' }).focus();
      await page.keyboard.press('Tab');
      const dev = firstTile.getByRole('link', { name: 'Dev →' });
      await expect(dev).toBeFocused();
      await expect(dev).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
      await expect(dev).toHaveCSS('outline-style', 'solid');
      await expect(dev.locator('..')).toHaveCSS('opacity', '1');
    });
  }

  test('respects reduced motion for chart feedback and featured paging', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(site.url);
    const chart = page.getByRole('region', {
      name: 'One composition, every surface',
    });
    const items = chart.locator('[tabindex="0"]');
    for (const index of [0, 1]) {
      const item = items.nth(index);
      await item.focus();
      await expect(item).toHaveCSS('transition-duration', '0s');
      await expect(item).toHaveCSS('transform', 'none');
      await expect(item).toHaveCSS('scale', 'none');
      await item.hover();
      await expect(item).toHaveCSS('transform', 'none');
      await expect(item).toHaveCSS('scale', 'none');
    }
    const featured = page.getByRole('region', {
      name: 'Featured primitives',
      exact: true,
    });
    const next = featured.getByRole('button', { name: 'Next primitives' });
    const strip = featured.locator(':scope > div:last-child');
    await strip.evaluate((element) => {
      element.scrollBy = (options?: ScrollToOptions | number) => {
        element.setAttribute(
          'data-scroll-behavior',
          typeof options === 'object' ? String(options.behavior) : 'number'
        );
      };
    });
    if (await next.isEnabled()) {
      await next.click();
      await expect(strip).toHaveAttribute('data-scroll-behavior', 'instant');
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (await next.isEnabled()) {
      await next.click();
      await expect(strip).toHaveAttribute('data-scroll-behavior', 'smooth');
    }
    await items.nth(1).focus();
    await items.nth(1).hover();
    await expect(items.nth(1)).toHaveCSS('transition-duration', '0.12s');
    await expect(items.nth(1)).not.toHaveCSS('transform', 'none');
  });

  test('pages stacked featured tiles three at a time and preserves desktop browsing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(site.url);
    const featured = page.getByRole('region', {
      name: 'Featured primitives',
      exact: true,
    });
    const tiles = featured.locator(':scope > div:last-child > *');
    const visible = featured.locator(':scope > div:last-child > :visible');
    const previous = featured.getByRole('button', {
      name: 'Previous primitives',
    });
    const next = featured.getByRole('button', { name: 'Next primitives' });
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
    await expect(previous).toBeDisabled();
    for (let offset = 0; offset < count; offset += 3) {
      await expect(visible).toHaveCount(Math.min(3, count - offset));
      expect(await visible.allTextContents()).toEqual(
        (await tiles.allTextContents()).slice(offset, offset + 3)
      );
      if (offset + 3 < count) {
        await next.click();
      }
    }
    await expect(next).toBeDisabled();
    await expect(
      featured.getByRole('link', { name: /Open the gallery/ })
    ).toBeVisible();
    if (count <= 3) {
      await expect(previous).toBeDisabled();
      await page.setViewportSize({ width: 1920, height: 900 });
      await expect(visible).toHaveCount(count);
      return;
    }
    await previous.click();
    await expect(next).toBeEnabled();
    await page.setViewportSize({ width: 1920, height: 900 });
    await expect(visible).toHaveCount(count);
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(previous).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(visible).toHaveCount(3);
    await expect(next).toBeEnabled();
  });
});

test.describe('decks', () => {
  test.skip(
    Boolean(process.env.STUDIO_CONFIG),
    'needs the repository slides pack'
  );

  let site: StaticServer;

  test.beforeAll(async () => {
    site = await serveStatic(await buildSite(), BASE);
  });

  test.afterAll(async () => {
    await site.close();
  });

  test('opens a deck from the nav, steps through builds and slides, and keeps the place', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const deck = '#/app/decks/isomer-every-surface';
    const counter = page.getByText(/^\d+ of \d+$/);
    const build = page.getByText(/^Build \d+ of \d+$/);
    const next = page.getByRole('button', { name: 'Next', exact: true });
    /** Build parts `showSlideBuild` hides in the stage's shadow root. */
    const hidden = () =>
      page
        .locator('main')
        .first()
        .evaluate((main) =>
          Array.from(main.querySelectorAll('*')).reduce(
            (total, element) =>
              total +
              (element.shadowRoot?.querySelectorAll('[data-slide-build-hidden]')
                .length ?? 0),
            0
          )
        );

    await page.goto(`${site.url}#/dev`);
    await page.getByRole('button', { name: 'Decks', exact: true }).click();
    await page
      .locator('main')
      .getByRole('button', {
        name: 'Isomer: one composition, every surface',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${deck}$`));
    await expect(
      page.getByRole('button', { name: /^Slide \d+: / })
    ).toHaveCount(33);

    await page.goto(`${site.url}${deck}/6/0`);
    await expect(counter).toHaveText('6 of 33');
    await expect(build).toHaveText('Build 0 of 3');
    await expect.poll(hidden).toBeGreaterThan(0);
    const unbuilt = await hidden();

    await page.keyboard.press('ArrowRight');
    await expect(build).toHaveText('Build 1 of 3');
    await expect(page).toHaveURL(new RegExp(`${deck}/6/1$`));
    await expect.poll(hidden).toBeLessThan(unbuilt);

    await next.click();
    await next.click();
    await expect(build).toHaveText('Build 3 of 3');
    await expect.poll(hidden).toBe(0);
    await next.click();
    await expect(counter).toHaveText('7 of 33');

    await page.reload();
    await expect(counter).toHaveText('7 of 33');
    await page.keyboard.press('ArrowLeft');
    await expect(counter).toHaveText('6 of 33');
    await expect(build).toHaveText('Build 3 of 3');
    await page.keyboard.press('Home');
    await expect(counter).toHaveText('1 of 33');

    await page.goto(`${site.url}${deck}/99/0`);
    await expect(counter).toHaveText('1 of 33');

    expect(problems).toEqual([]);
  });

  test('follows a section slide link, keeps thumbnails out of the tab order, and presents full screen', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const deck = '#/app/decks/isomer-every-surface';
    const counter = page.getByText(/^\d+ of \d+$/);
    const build = page.getByText(/^Build \d+ of \d+$/);

    await page.goto(`${site.url}${deck}`);
    const thumbnailLink = page.locator('main ol a[href="?slide=3"]');
    await expect(thumbnailLink).toHaveCount(1);
    expect(
      await thumbnailLink.evaluate((link: HTMLAnchorElement) => {
        link.focus();
        return (link.getRootNode() as ShadowRoot).activeElement === link;
      })
    ).toBe(false);

    await page.goto(`${site.url}${deck}/3/0`);
    await page.locator('main a[href="?slide=3"]').click();
    await expect(page).toHaveURL(new RegExp(`${deck}/4/0$`));
    await expect(counter).toHaveText('4 of 33');

    // Wider than the slide's 1920px, which `zoom="fit"` alone would never scale up to.
    await page.setViewportSize({ width: 2400, height: 1350 });
    await page.goto(`${site.url}${deck}/6/0`);
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement !== null))
      .toBe(true);
    await page.keyboard.press('ArrowRight');
    await expect(build).toHaveText('Build 1 of 3');
    expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(
      true
    );

    const { innerWidth, innerHeight } = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }));
    const slideWidth = () =>
      page.evaluate(() => {
        const slide = Array.from(
          document.fullscreenElement?.querySelectorAll('*') ?? []
        )
          .map(({ shadowRoot }) => shadowRoot?.querySelector('.isomerDeckRoot'))
          .find(Boolean);
        return slide?.getBoundingClientRect().width ?? 0;
      });
    await expect
      .poll(slideWidth)
      .toBeCloseTo(Math.min(innerWidth, (innerHeight * 16) / 9), 0);

    await page.evaluate(() => document.exitFullscreen());
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement))
      .toBeNull();

    expect(problems).toEqual([]);
  });

  test('advances on a click, shows a slide on each surface, and needs dev for a PDF', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    const deck = '#/app/decks/isomer-every-surface';
    const counter = page.getByText(/^\d+ of \d+$/);
    const build = page.getByText(/^Build \d+ of \d+$/);
    const output = page.getByRole('group', { name: 'Output' });

    await page.goto(`${site.url}${deck}/6/0`);
    await expect(build).toHaveText('Build 0 of 3');
    await page.locator('[data-test-subj="deckStage"]').click();
    await expect(build).toHaveText('Build 1 of 3');
    await page.keyboard.press('Space');
    await expect(build).toHaveText('Build 2 of 3');
    await page.keyboard.press('PageUp');
    await expect(build).toHaveText('Build 1 of 3');

    await output.getByRole('button', { name: 'Markdown', exact: true }).click();
    await expect(build).toHaveCount(0);
    await expect(page.locator('[data-test-subj="deckOutput"]')).toContainText(
      'The problem'
    );
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText('7 of 33');
    await expect(page).toHaveURL(new RegExp(`${deck}/7/0$`));
    await expect(
      output.getByRole('button', { name: 'Slack', exact: true })
    ).toBeVisible();

    await output.getByRole('button', { name: 'HTML', exact: true }).click();
    await page
      .locator('[data-test-subj="deckOutput"] iframe')
      .contentFrame()
      .locator('body')
      .click();
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText('8 of 33');

    await page.setViewportSize({ width: 1000, height: 700 });
    await output.getByRole('button', { name: 'Slide', exact: true }).click();
    const stageWidth = await page
      .locator('[data-test-subj="deckStage"]')
      .evaluate((stage) => stage.getBoundingClientRect().width);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const slide = Array.from(document.querySelectorAll('main *'))
            .map(({ shadowRoot }) =>
              shadowRoot?.querySelector('.isomerDeckRoot')
            )
            .find(Boolean);
          return slide?.getBoundingClientRect().width ?? Infinity;
        })
      )
      .toBeLessThanOrEqual(stageWidth + 1);

    await expect(
      page.getByRole('button', { name: 'Download PDF', exact: true })
    ).toBeDisabled();

    expect(problems).toEqual([]);
  });
});

test.describe('dev server', () => {
  test.skip(SKIP_DEV, 'STUDIO_DEV=0');

  let dev: { url: string; child: ChildProcess };

  test.beforeAll(async () => {
    dev = await startDev();
  });

  test.afterAll(() => {
    dev.child.removeAllListeners('close');
    dev.child.kill('SIGTERM');
  });

  test('compiles edits and rasterizes them on the server', async ({ page }) => {
    const problems = watchProblems(page);

    await page.goto(`${dev.url}${EDIT_ROUTE}`);
    await expectMonacoReady(page);
    await expectSlackStyled(page);
    await expectPngLoaded(page);

    const transformed = page.waitForResponse(
      (response) =>
        response.url().endsWith('/transform') &&
        response.request().method() === 'POST'
    );
    const rasterized = page.waitForResponse(
      (response) =>
        response.url().endsWith('/png') &&
        (response.request().postData() ?? '').includes(EDITED_TEXT)
    );
    await editFirstString(page);
    expect((await transformed).ok()).toBe(true);
    await expect(reactPreview(page)).toContainText(EDITED_TEXT);
    const png = await rasterized;
    expect(png.ok(), await png.text()).toBe(true);
    await expectPngLoaded(page);

    expect(problems).toEqual([]);
  });

  test('serves apps and their CSS', async ({ page }) => {
    const problems = watchProblems(page);
    await exerciseApp(page, dev.url);
    expect(problems).toEqual([]);
  });

  test('downloads a deck as one PDF', async ({ page }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'needs the repository slides pack'
    );
    const problems = watchProblems(page);

    await page.goto(`${dev.url}#/app/decks/isomer-every-surface/1/0`);
    const downloaded = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download PDF', exact: true })
      .click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('isomer-every-surface.pdf');
    const path = await download.path();
    expect(readFileSync(path).subarray(0, 5).toString()).toBe('%PDF-');

    expect(problems).toEqual([]);
  });
});

test.describe('dev server reload', () => {
  test.skip(
    SKIP_DEV || Boolean(process.env.STUDIO_CONFIG),
    'needs the repository fixture pack'
  );

  // Inside the package, so the config resolves React and the runtime, but outside `node_modules`, which the dev server does not watch.
  let dir: string;
  let dev: { url: string; child: ChildProcess };

  const writeOptions = (title: string, framed: boolean) =>
    writeFileSync(
      join(dir, 'options.ts'),
      `export const title = ${JSON.stringify(title)};\nexport const framed = ${framed};\n`
    );

  const writeFonts = (exported: string) =>
    writeFileSync(join(dir, 'fonts.ts'), `export default ${exported};\n`);

  test.beforeAll(async () => {
    const artifacts = join(packageDir, '.artifacts');
    mkdirSync(artifacts, { recursive: true });
    dir = mkdtempSync(join(artifacts, 'isomer-studio-reload-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ type: 'commonjs' })
    );
    writeOptions('Before reload', false);
    writeFonts('[]');
    writeFileSync(
      join(dir, 'counter.ts'),
      [
        "import { createElement, useState } from 'react';",
        '',
        'const Counter = () => {',
        '  const [count, setCount] = useState(0);',
        "  return createElement('button', { type: 'button', onClick: () => setCount(count + 1) }, `Count ${count}`);",
        '};',
        '',
        'export default Counter;',
        '',
      ].join('\n')
    );
    writeFileSync(
      join(dir, 'isomer-studio.config.ts'),
      [
        "import { createElement } from 'react';",
        "import { createIsomerRuntime } from '@elastic/isomer-runtime';",
        `import { componentsPack } from ${JSON.stringify(join(packageDir, 'src/fixtures/components_pack'))};`,
        "import { framed, title } from './options';",
        '',
        'const card = {',
        '  defaultWidth: 320,',
        '  theme: { light: undefined, dark: undefined },',
        '  estimateHeight: () => 100,',
        "  wrap: (_header: unknown, body: unknown) => createElement('div', null, body),",
        '};',
        '',
        'export default {',
        '  title,',
        "  apps: [{ id: 'counter', title: 'Counter', load: () => import('./counter') }],",
        "  imageFonts: './fonts.ts',",
        '  runtime: createIsomerRuntime({',
        '    packs: [componentsPack],',
        '    ...(framed ? { frames: { card } } : {}),',
        '  }),',
        '};',
        '',
      ].join('\n')
    );
    dev = await startDev(join(dir, 'isomer-studio.config.ts'));
  });

  test.afterAll(() => {
    dev.child.removeAllListeners('close');
    dev.child.kill('SIGTERM');
    rmSync(dir, { recursive: true, force: true });
  });

  test('hot-updates the page and the server-side config when a pack module changes', async ({
    page,
  }) => {
    const composition = {
      type: 'view',
      body: [{ type: 'callout', body: 'Reloaded.' }],
      theme: 'light',
    };
    const postPng = () =>
      page.request.post(`${dev.url}png`, { data: composition });

    await page.goto(dev.url);
    await expect(page).toHaveTitle('Before reload');
    expect((await postPng()).status()).toBe(404);
    await page.evaluate(() => {
      document.documentElement.dataset.mounted = 'once';
    });

    writeOptions('After reload', true);

    await expect(page).toHaveTitle('After reload', { timeout: 60_000 });
    await expect(page.getByText('After reload').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.dataset.mounted)
    ).toBe('once');
    const png = await postPng();
    expect(png.status(), await png.text()).toBe(200);
    expect(png.headers()['content-type']).toBe('image/png');
  });

  test('keeps an open app mounted when a pack module changes', async ({
    page,
  }) => {
    await page.goto(`${dev.url}#/app/counter/`);
    await page.getByRole('button', { name: 'Count 0' }).click();
    await expect(page.getByRole('button', { name: 'Count 1' })).toBeVisible();

    writeOptions('App reload', false);

    await expect(page).toHaveTitle('App reload', { timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Count 1' })).toBeVisible();
  });

  test('re-imports `imageFonts` when it changes, and recovers from a bad export', async ({
    page,
  }) => {
    const postPdf = async () => {
      const response = await page.request.post(`${dev.url}pdf`, {
        data: { compositions: [{ type: 'view', body: [], theme: 'light' }] },
      });
      return `${response.status()} ${response.ok() ? '' : await response.text()}`;
    };

    await page.goto(dev.url);
    writeOptions('Fonts reload', true);
    await expect(page).toHaveTitle('Fonts reload', { timeout: 60_000 });
    await expect.poll(postPdf).toBe('200 ');

    writeFonts('"not a list"');
    await expect
      .poll(postPdf, { timeout: 60_000 })
      .toContain('must default-export an array of takumi font loaders');

    // Vite's watcher drops a change within 50ms of the last one to the same file, and the 400 can arrive sooner.
    await delay(100);
    writeFonts('[]');
    await expect.poll(postPdf, { timeout: 60_000 }).toBe('200 ');
  });
});
