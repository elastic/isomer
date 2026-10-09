/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
    await page.keyboard.press('ControlOrMeta+A');
    await expect(editor(page).locator('.selected-text').first()).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.keyboard.insertText(edited);
};

const reactPreview = (page: Page) =>
  page.getByRole('region', { name: 'React preview' });

test.describe('static build', () => {
  let site: StaticServer;
  let tempDir: string | undefined;

  test.beforeAll(async () => {
    let dir = PREBUILT_SITE;
    if (dir === undefined) {
      tempDir = mkdtempSync(join(tmpdir(), 'isomer-studio-site-'));
      dir = join(tempDir, 'site');
      await runCli(['build', '--config', CONFIG, '--out', dir, '--base', BASE]);
    }
    site = await serveStatic(dir, BASE);
  });

  test.afterAll(async () => {
    await site.close();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
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
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
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
});

test.describe('dev server reload', () => {
  test.skip(
    SKIP_DEV || Boolean(process.env.STUDIO_CONFIG),
    'needs the repository fixture pack'
  );

  // Under the package's `node_modules`, so the config resolves React and the runtime, and loads as CommonJS.
  let dir: string;
  let dev: { url: string; child: ChildProcess };

  const writeOptions = (title: string, framed: boolean) =>
    writeFileSync(
      join(dir, 'options.ts'),
      `export const title = ${JSON.stringify(title)};\nexport const framed = ${framed};\n`
    );

  test.beforeAll(async () => {
    const cache = join(packageDir, 'node_modules/.cache');
    mkdirSync(cache, { recursive: true });
    dir = mkdtempSync(join(cache, 'isomer-studio-reload-'));
    writeOptions('Before reload', false);
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

  test('reloads the page and the server-side config when a pack module changes', async ({
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

    writeOptions('After reload', true);

    await expect(page).toHaveTitle('After reload', { timeout: 60_000 });
    await expect(page.getByText('After reload').first()).toBeVisible();
    const png = await postPng();
    expect(png.status(), await png.text()).toBe(200);
    expect(png.headers()['content-type']).toBe('image/png');
  });
});
