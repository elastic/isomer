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
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { StaticServer } from './serve_static';
import { serveStatic } from './serve_static';

// Playwright loads this spec as CommonJS: the package has no `"type": "module"`.
const packageDir = resolve(__dirname, '..');
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

const reactPreview = (page: Page) => page.locator('[title="HTML preview"]');

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

/** Where a card's render sits inside the frame's padding, and anything in the frame that could scroll. */
const layoutOf = (page: Page, name: string) =>
  page
    .getByRole('region', { name })
    .locator('[data-test-subj="surfaceFrame"]')
    .evaluate((frame) => {
      const box = frame.getBoundingClientRect();
      const style = getComputedStyle(frame);
      const inner = {
        top: box.top + parseFloat(style.paddingTop),
        bottom: box.bottom - parseFloat(style.paddingBottom),
        left: box.left + parseFloat(style.paddingLeft),
        right: box.right - parseFloat(style.paddingRight),
      };
      const render = frame.firstElementChild!.getBoundingClientRect();
      const scrollable = Array.from(frame.querySelectorAll('*')).filter(
        (element) => {
          const { overflowX, overflowY } = getComputedStyle(element);
          return (
            (/auto|scroll/.test(overflowX) &&
              element.scrollWidth > element.clientWidth) ||
            (/auto|scroll/.test(overflowY) &&
              element.scrollHeight > element.clientHeight)
          );
        }
      ).length;
      return {
        ratio: (inner.right - inner.left) / (inner.bottom - inner.top),
        inset: inner.left - box.left,
        topGap: render.top - inner.top,
        bottomGap: inner.bottom - render.bottom,
        leftGap: render.left - inner.left,
        rightGap: inner.right - render.right,
        scrollable,
      };
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

  test('shares a composition by link, and holds linked JSX until it is run', async ({
    page,
    browser,
  }) => {
    const problems = watchProblems(page);
    const composer = (on: Page) => {
      const workbench = on.getByRole('region', {
        name: 'Composition workbench',
      });
      return {
        preview: workbench.locator('[title="HTML preview"]'),
        valid: workbench.getByText('Valid', { exact: true }),
      };
    };
    await page.goto(`${site.url}${EDIT_ROUTE}`);
    await expectMonacoReady(page);
    await page
      .getByRole('button', { name: 'Open in the composition editor' })
      .click();
    await expect(page).toHaveURL(/#\/compose\?code=[\w-]+&lang=jsx$/);
    await expect(
      page.getByRole('button', { name: 'Composition', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    await expect(composer(page).preview).toBeVisible();
    await expect(composer(page).valid).toBeVisible();
    const link = page.url();

    await page.reload();
    await expectMonacoReady(page);
    await expect(composer(page).preview).toBeVisible();
    expect(problems).toEqual([]);

    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    const otherProblems = watchProblems(other);
    await other.goto(link);
    await expect(other.getByText('Run the JSX from this link?')).toBeVisible();
    await expect(composer(other).preview).toHaveCount(0);
    await other.getByRole('button', { name: 'Run this code' }).click();
    await expect(composer(other).preview).toBeVisible();
    expect(otherProblems).toEqual([]);
    await fresh.close();
  });

  test('fits a slide inside its padded 16:9 card without scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(`${site.url}${EDIT_ROUTE}`);
    await expectMonacoReady(page);
    await expectPngLoaded(page);

    for (const name of ['Web preview', 'PNG preview']) {
      const layout = await layoutOf(page, name);
      expect(layout.ratio, name).toBeCloseTo(16 / 9, 1);
      expect(layout.inset, name).toBeGreaterThan(0);
      expect(layout.topGap, name).toBeGreaterThanOrEqual(-0.5);
      expect(layout.bottomGap, name).toBeGreaterThanOrEqual(-0.5);
      expect(layout.scrollable, name).toBe(0);
    }
  });

  test('stacks the Dev editor above all previews when the window is narrow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.goto(`${site.url}${EDIT_ROUTE}`);
    await expectMonacoReady(page);

    const panels = page.locator('.euiResizablePanel');
    const editor = panels.nth(0);
    const preview = panels.nth(1);
    await expect
      .poll(() =>
        page
          .locator('.euiResizableContainer')
          .evaluate((element) => getComputedStyle(element).flexDirection)
      )
      .toBe('column');

    const narrowBounds = await Promise.all([
      editor.boundingBox(),
      preview.boundingBox(),
    ]);
    const editorContentBounds = await editor
      .getByRole('region', { name: 'Source editor' })
      .boundingBox();
    expect(narrowBounds[0]).not.toBeNull();
    expect(narrowBounds[1]).not.toBeNull();
    expect(editorContentBounds).not.toBeNull();
    expect(editorContentBounds!.width).toBeGreaterThanOrEqual(
      narrowBounds[0]!.width - 2
    );
    expect(narrowBounds[1]!.y).toBeGreaterThan(narrowBounds[0]!.y);
    for (const surface of ['Web', 'Slack', 'Markdown', 'Text', 'PNG']) {
      await expect(
        preview.getByRole('heading', { level: 3, name: surface })
      ).toBeAttached();
    }
    await expect(
      preview.getByRole('combobox', { name: 'Visual preview surface' })
    ).toHaveCount(0);
    await expect(preview.getByTitle('HTML preview')).toBeAttached();
    await expect(editor.locator('[data-keybinding-context]')).toHaveCSS(
      'border-bottom-width',
      '0px'
    );
    for (const mode of ['Light', 'Dark']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      const backgrounds = await preview
        .getByRole('region', { name: 'Web preview', exact: true })
        .evaluate((card) => ({
          header: getComputedStyle(card.firstElementChild!).backgroundColor,
          board: getComputedStyle(
            card.closest('[aria-label="Outputs"]')!.lastElementChild!
          ).backgroundColor,
        }));
      expect(backgrounds.header).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgrounds.header).not.toBe(backgrounds.board);
    }
    const visualGroup = preview.getByRole('region', {
      name: 'Visual output previews',
    });
    const visualGrid = visualGroup.getByRole('region', {
      name: 'Visual preview grid',
    });
    const otherGroup = preview.getByRole('region', {
      name: 'Other output previews',
    });
    await expect
      .poll(() =>
        visualGrid.evaluate((element) => ({
          columns: getComputedStyle(element).gridTemplateColumns,
          overflows: element.scrollWidth > element.clientWidth,
        }))
      )
      .toMatchObject({ overflows: false });
    const [visualBounds, otherBounds] = await Promise.all([
      visualGroup.boundingBox(),
      otherGroup.boundingBox(),
    ]);
    expect(visualBounds).not.toBeNull();
    expect(otherBounds).not.toBeNull();
    expect(otherBounds!.y).toBeGreaterThan(visualBounds!.y);

    await page.setViewportSize({ width: 1400, height: 1000 });
    await expect
      .poll(() =>
        page
          .locator('.euiResizableContainer')
          .evaluate((element) => getComputedStyle(element).flexDirection)
      )
      .toBe('row');
    const wideBounds = await Promise.all([
      editor.boundingBox(),
      preview.boundingBox(),
    ]);
    expect(wideBounds[0]!.y).toBe(wideBounds[1]!.y);
    expect(wideBounds[1]!.x).toBeGreaterThan(wideBounds[0]!.x);
    await expect
      .poll(async () => {
        const [left, right] = await Promise.all([
          editor.boundingBox(),
          preview.boundingBox(),
        ]);
        return Math.abs(right!.x - (left!.x + left!.width));
      })
      .toBeLessThanOrEqual(1);
    const toolbarBottoms = await Promise.all(
      ['Source editor', 'Outputs'].map((name) =>
        page
          .getByRole('region', { name, exact: true })
          .evaluate(
            (element) =>
              element.firstElementChild!.getBoundingClientRect().bottom
          )
      )
    );
    expect(
      Math.abs(toolbarBottoms[0]! - toolbarBottoms[1]!)
    ).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 2200, height: 700 });
    for (const group of [visualGroup, otherGroup]) {
      const cards = group.locator('section[aria-label$=" preview"]');
      const bounds = await cards.evaluateAll((elements) =>
        elements.map((element) => {
          const { x, y, bottom } = element.getBoundingClientRect();
          return { x, y, bottom };
        })
      );
      for (let index = 1; index < bounds.length; index++) {
        expect(bounds[index]!.x).toBe(bounds[0]!.x);
        expect(bounds[index]!.y).toBeGreaterThan(bounds[index - 1]!.bottom);
      }
    }
    const nav = page.getByRole('navigation', { name: 'Primitives' });
    await nav
      .getByRole('button', { name: 'Collapse primitive navigation' })
      .click();
    await expect
      .poll(() =>
        nav.evaluate((element) => element.getBoundingClientRect().width)
      )
      .toBe(72);
    const railButtons = nav.getByRole('button');
    const railBounds = await railButtons.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, width, height } = button.getBoundingClientRect();
        return { center: x + width / 2, width, height };
      })
    );
    for (const bounds of railBounds) {
      expect(bounds.width).toBe(32);
      expect(bounds.height).toBe(32);
      expect(
        Math.abs(bounds.center - railBounds[0]!.center)
      ).toBeLessThanOrEqual(1);
    }
    await railButtons.last().scrollIntoViewIfNeeded();
    await expect(railButtons.first()).toBeInViewport();
    await expect(railButtons.last()).toBeInViewport();
  });

  test('serves apps, their chunks and their CSS from the sub-path', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await exerciseApp(page, site.url);
    expect(problems).toEqual([]);
  });

  test('toggles real enhancements in the combined browser preview', async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'uses the slides pack copy enhancement'
    );
    const problems = watchProblems(page);
    for (const primitive of ['slideHeading', 'slidePipeline', 'slideCommand']) {
      await page.goto(`${site.url}#/dev/${primitive}/0`);
      await expectMonacoReady(page);
      const panel = page.getByRole('region', {
        name: 'Web preview',
      });
      await expect(panel).toBeVisible();
      const toggle = panel.getByRole('button', { name: 'Enhancements (0/0)' });
      if (primitive === 'slideHeading') {
        await expect(toggle).toBeDisabled();
      } else {
        const name =
          primitive === 'slidePipeline' ? 'Slide builds' : 'Copy command';
        await panel.getByRole('button', { name: 'Enhancements (0/1)' }).click();
        const applicable = page.getByRole('checkbox', { name });
        await applicable.check();
        if (primitive === 'slideCommand') {
          await expect(panel.locator('[data-slide-copy]')).toHaveCount(1);
        }
        await applicable.uncheck();
        await panel.getByRole('button', { name: 'Enhancements (0/1)' }).click();
      }
      await expect(
        page.getByRole('region', { name: 'Primitive prop reference' })
      ).toHaveCount(0);
      await page.getByRole('button', { name: 'Props', exact: true }).click();
      const reference = page.getByRole('region', {
        name: 'Primitive prop reference',
      });
      await expect(reference.getByRole('table')).not.toHaveCount(0);
      await expect(
        reference.getByRole('columnheader', { name: 'Description' })
      ).toHaveCount(1);
      const referenceBounds = (await reference.boundingBox())!;
      const editorBounds = (await page
        .locator('.euiResizablePanel')
        .first()
        .boundingBox())!;
      const previewBounds = (await page
        .locator('.euiResizablePanel')
        .nth(1)
        .boundingBox())!;
      expect(referenceBounds.width).toBeGreaterThan(editorBounds.width);
      expect(referenceBounds.width).toBeGreaterThan(previewBounds.width);
      const resizer = page.getByRole('button', {
        name: 'Press the left or right arrow keys to adjust panels size',
      });
      await resizer.focus();
      await page.keyboard.press('ArrowRight');
      expect(
        Math.abs((await reference.boundingBox())!.width - referenceBounds.width)
      ).toBeLessThan(2);
      if (primitive === 'slidePipeline') {
        const descriptionCell = reference.getByRole('cell').filter({
          hasText: 'What goes in, as a short code-style chip',
        });
        expect((await descriptionCell.boundingBox())!.width).toBeGreaterThan(
          160
        );
      }
      await expect(page.getByRole('button', { name: '+ Prop' })).toHaveCount(0);
      if (primitive === 'slidePipeline') {
        await reference
          .getByRole('tab', { name: 'SlidePipeline.Step', exact: true })
          .click();
        await expect(
          reference.getByRole('tabpanel', {
            name: 'SlidePipeline.Step',
            exact: true,
          })
        ).toContainText('title');
      }
      const slack = page.locator('#slack_blocks_to_jsx');
      await expect(slack).toBeAttached();
      const slackBackground = await slack.evaluate((element) => {
        const wrapper = element.parentElement!;
        const theme = element.getAttribute('data-theme');
        return {
          actual: getComputedStyle(wrapper).backgroundColor,
          expected: theme === 'dark' ? 'rgb(26, 29, 33)' : 'rgb(255, 255, 255)',
        };
      });
      expect(slackBackground.actual).toBe(slackBackground.expected);
      await expect(panel.locator('[data-slide-copy]')).toHaveCount(0);
      await expect(panel.locator('iframe')).toHaveCount(0);
      await expect(
        panel.getByRole('combobox', { name: 'Visual preview surface' })
      ).toHaveCount(0);
      await expect(panel.getByTitle('HTML preview')).toBeAttached();
    }
    await page.goto(`${site.url}#/dev/slideQuadrant/0`);
    await expectMonacoReady(page);
    await page.getByRole('button', { name: 'Props', exact: true }).click();
    const nestedReference = page.getByRole('region', {
      name: 'Primitive prop reference',
    });
    await expect(
      nestedReference.getByRole('tab', {
        name: 'SlideQuadrant.Cell',
        exact: true,
      })
    ).toHaveCount(1);
    await expect(
      nestedReference.getByRole('tab', {
        name: 'SlideQuadrant.Item',
        exact: true,
      })
    ).toHaveCount(1);
    await expect(
      nestedReference.getByRole('tab', {
        name: 'SlideQuadrant.Cell.Item',
        exact: true,
      })
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Props', exact: true }).click();
    await expect(nestedReference).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('keeps the Reference example usable on a mobile viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${site.url}#/docs/slidePipeline/0`);
    const header = page.locator('header').first();
    const examples = page.getByRole('region', { name: 'Examples' });
    const views = examples.getByRole('group', { name: 'Example view' });

    await expect(header).toBeVisible();
    const outline = page.getByRole('navigation', { name: 'On this page' });
    const [outlineBox, examplesBox] = await Promise.all([
      outline.boundingBox(),
      examples.boundingBox(),
    ]);
    expect(outlineBox!.y + outlineBox!.height).toBeLessThanOrEqual(
      examplesBox!.y
    );
    await expect
      .poll(() =>
        header.evaluate((element) => element.scrollWidth <= element.clientWidth)
      )
      .toBe(true);
    await expect(
      page.getByRole('button', { name: 'Expand primitive navigation' })
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(
      views.getByRole('button', { name: 'Example source' })
    ).toBeVisible();

    await views.getByRole('button', { name: 'Example source' }).click();
    await expect(examples.getByRole('tabpanel')).toBeVisible();
    const rendered = views.getByRole('button', { name: 'Rendered' });
    await rendered.focus();
    await page.keyboard.press('Enter');
    await expect(rendered).toHaveAttribute('aria-pressed', 'true');
  });

  test('scrolls only the content when jumping within a Reference page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1013, height: 600 });
    await page.goto(`${site.url}#/docs/titleSlide/0`);
    const header = page.locator('header').first();
    const main = page.locator('main').first();
    await page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('button', { name: 'Props', exact: true })
      .click();

    await expect
      .poll(() => main.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        header.evaluate((element) => element.getBoundingClientRect().top)
      )
      .toBe(0);
    expect(
      await main.evaluate((element) => {
        let shell = element.parentElement;
        while (shell && shell.scrollHeight <= shell.clientHeight) {
          shell = shell.parentElement;
        }
        return shell === document.documentElement || shell === null;
      })
    ).toBe(true);
  });

  test('scrolls a long validation list within the workbench footer', async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'needs the repository slides pack'
    );
    await page.setViewportSize({ width: 1440, height: 720 });
    await page.goto(`${site.url}#/dev/slidePipeline/0`);
    await expectMonacoReady(page);
    await page
      .getByRole('group', { name: 'Source format' })
      .getByRole('button', { name: 'JSON' })
      .click();
    await editor(page).locator('.view-lines').click();
    await expect(async () => {
      await page.keyboard.press('Control+A');
      await expect(editor(page).locator('.selected-text').first()).toBeVisible({
        timeout: 1000,
      });
    }).toPass();
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(
      JSON.stringify({ type: 'slidePipeline', steps: Array(30).fill({}) })
    );
    // JSON mode auto-closes the leading brace and quote after the cursor.
    await page.keyboard.press('Control+Shift+End');
    await page.keyboard.press('Delete');

    const errors = page.getByRole('region', { name: 'Validation errors' });
    await expect(errors.getByRole('listitem').nth(20)).toBeAttached();
    expect(
      await errors.evaluate(
        (element) => element.scrollHeight > element.clientHeight
      )
    ).toBe(true);
    const last = errors.getByRole('listitem').last();
    await expect(last).not.toBeInViewport();
    await errors.focus();
    await page.keyboard.press('End');
    await expect(last).toBeInViewport();

    await page.getByRole('button', { name: 'Props', exact: true }).click();
    const reference = page.getByRole('region', {
      name: 'Primitive prop reference',
    });
    await expect(reference.getByRole('table')).toBeInViewport();
    await reference
      .getByRole('tab', { name: 'SlidePipeline.Step', exact: true })
      .click();
    await expect(
      reference.getByRole('tabpanel', {
        name: 'SlidePipeline.Step',
        exact: true,
      })
    ).toContainText('title');
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
      // EUI's rem sizes over the 14px root land a hair under whole pixels, e.g. 10.9998px for 11px.
      expect(layout.labelSizes.every((size) => Math.round(size) >= 11)).toBe(
        true
      );
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
      await firstTile.getByRole('link', { name: 'Reference →' }).focus();
      await page.keyboard.press('Tab');
      const workbench = firstTile.getByRole('link', { name: 'Workbench →' });
      await expect(workbench).toBeFocused();
      // Home's focus ring is the dark theme's heading color, Borealis #E3E8F2.
      await expect(workbench).toHaveCSS('outline-color', 'rgb(227, 232, 242)');
      await expect(workbench).toHaveCSS('outline-style', 'solid');
      await expect(workbench.locator('..')).toHaveCSS('opacity', '1');
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
    // The card's transition is euiTheme.animation.fast.
    await expect(items.nth(1)).toHaveCSS('transition-duration', '0.15s');
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
    await page.locator('[data-test-subj="deckOutput"] .isomer').click();
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

test.describe('preview layout', () => {
  test.skip(
    SKIP_DEV || Boolean(process.env.STUDIO_CONFIG),
    'needs the repository fixture pack'
  );

  let dir: string;
  let dev: { url: string; child: ChildProcess };

  test.beforeAll(async () => {
    const artifacts = join(packageDir, '.artifacts');
    mkdirSync(artifacts, { recursive: true });
    dir = mkdtempSync(join(artifacts, 'isomer-studio-layout-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ type: 'commonjs' })
    );
    writeFileSync(
      join(dir, 'isomer-studio.config.ts'),
      [
        "import { createElement } from 'react';",
        "import { createIsomerRuntime } from '@elastic/isomer-runtime';",
        `import { componentsPack } from ${JSON.stringify(join(packageDir, 'src/fixtures/components_pack'))};`,
        '',
        'const card = {',
        '  defaultWidth: 480,',
        "  sizing: 'content' as const,",
        '  theme: { light: undefined, dark: undefined },',
        '  estimateHeight: () => 100,',
        "  wrap: (_header: unknown, body: unknown) => createElement('div', { style: { padding: 16, background: '#ffffff' } }, body),",
        '};',
        '',
        'export default {',
        "  title: 'Layout',",
        '  runtime: createIsomerRuntime({ packs: [componentsPack], frames: { card } }),',
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

  /** Replaces the editor's composition with its body repeated `times` times. */
  const repeatBody = async (page: Page, times: number) => {
    const source = (await editor(page).locator('.view-lines').innerText())
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><');
    const [, open = '', body = '', close = ''] =
      /^(<Composition[^>]*>)(.*)(<\/Composition>)$/.exec(source.trim()) ?? [];
    expect(body).not.toBe('');
    await editor(page).locator('.view-lines').click();
    await expect(async () => {
      await page.keyboard.press('Control+A');
      await expect(editor(page).locator('.selected-text').first()).toBeVisible({
        timeout: 1000,
      });
    }).toPass();
    await page.keyboard.insertText(`${open}${body.repeat(times)}${close}`);
  };

  test('centers a short render in its 16:9 card, inset from the edges', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(`${dev.url}#/dev/callout/0`);
    await expectMonacoReady(page);
    await expectPngLoaded(page);

    for (const name of ['Web preview', 'PNG preview']) {
      const layout = await layoutOf(page, name);
      expect(layout.ratio, name).toBeCloseTo(16 / 9, 1);
      expect(layout.inset, name).toBeGreaterThan(0);
      expect(layout.topGap, name).toBeGreaterThan(0);
      expect(Math.abs(layout.topGap - layout.bottomGap), name).toBeLessThan(1);
      expect(layout.leftGap, name).toBeGreaterThanOrEqual(-0.5);
      expect(layout.rightGap, name).toBeGreaterThanOrEqual(-0.5);
      expect(layout.scrollable, name).toBe(0);
    }
    const png = await layoutOf(page, 'PNG preview');
    expect(Math.abs(png.leftGap - png.rightGap)).toBeLessThan(1);
  });

  test('keeps the top of a render taller than its card in view, without scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(`${dev.url}#/dev/callout/0`);
    await expectMonacoReady(page);
    await repeatBody(page, 30);

    await expect
      .poll(async () => (await layoutOf(page, 'Web preview')).bottomGap)
      .toBeLessThan(0);
    const layout = await layoutOf(page, 'Web preview');
    expect(layout.ratio).toBeCloseTo(16 / 9, 1);
    expect(Math.abs(layout.topGap)).toBeLessThan(1);
    expect(layout.scrollable).toBe(0);
  });

  test('never overflows a fit card sideways while it resizes', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto(`${dev.url}#/dev/callout/0`);
    await expectMonacoReady(page);
    await page.evaluate(() => {
      const scrolled: string[] = [];
      (window as unknown as { scrolled: string[] }).scrolled = scrolled;
      const sample = () => {
        document
          .querySelectorAll('section[aria-label$="preview"] *')
          .forEach((element) => {
            const { overflowX } = getComputedStyle(element);
            if (
              /auto|scroll/.test(overflowX) &&
              element.scrollWidth > element.clientWidth
            ) {
              scrolled.push(`${element.scrollWidth}>${element.clientWidth}`);
            }
          });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    for (let width = 1600; width >= 1300; width -= 13) {
      await page.setViewportSize({ width, height: 1200 });
      await delay(40);
    }

    expect(
      await page.evaluate(
        () => (window as unknown as { scrolled: string[] }).scrolled
      )
    ).toEqual([]);
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
