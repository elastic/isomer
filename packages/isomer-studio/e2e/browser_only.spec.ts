/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { serveStatic } from './serve_static';

const root = resolve(__dirname, '../../..');
const cli =
  process.env.STUDIO_CLI ??
  join(root, 'packages/isomer-studio/bin/isomer-studio.js');
const config =
  process.env.STUDIO_CONFIG ?? join(root, 'isomer-studio.config.ts');
const route = process.env.STUDIO_EDIT_ROUTE ?? '#/dev/slideHeading/0';
const base = process.env.STUDIO_BROWSER_BASE ?? '/review/nested/';

test('browser-only static build keeps Web/JSX/apps without image requests', async ({
  page,
}) => {
  const dir = mkdtempSync(join(tmpdir(), 'isomer-browser-only-'));
  // Keep dependency resolution beside the consumer config, not the temporary output.
  const temporary = join(
    resolve(config, '..'),
    `.browser-only-${process.pid}.config.ts`
  );
  const site = process.env.STUDIO_BROWSER_SITE
    ? resolve(process.env.STUDIO_BROWSER_SITE)
    : join(dir, 'site');
  const trap = join(dir, 'no-images.cjs');
  writeFileSync(
    trap,
    `const { Module } = require('node:module');
const load = Module._load;
Module._load = function (id, ...args) {
  if (id.includes('isomer-image-takumi') || id.includes('@takumi-rs')) {
    throw new Error('Forbidden image backend load');
  }
  return load.call(this, id, ...args);
};
`
  );
  const command = ['--require', trap, cli];
  writeFileSync(
    temporary,
    `import config from ${JSON.stringify(config)};\nexport default { ...config, images: false, imageFonts: './missing-fonts-must-not-load.ts' };\n`
  );
  let server: Awaited<ReturnType<typeof serveStatic>> | undefined;
  try {
    execFileSync(
      process.execPath,
      [...command, 'check', '--config', temporary],
      {
        stdio: 'pipe',
      }
    );
    try {
      execFileSync(
        process.execPath,
        [...command, 'check', '--config', temporary, '--png'],
        { stdio: 'pipe' }
      );
      throw new Error('check --png unexpectedly accepted images: false');
    } catch (error) {
      expect(String(error)).toContain('--png conflicts with images: false');
    }
    if (!process.env.STUDIO_BROWSER_SITE) {
      execFileSync(
        process.execPath,
        [
          ...command,
          'build',
          '--config',
          temporary,
          '--out',
          site,
          '--base',
          base,
        ],
        { stdio: 'pipe' }
      );
    }
    expect(existsSync(join(site, 'png'))).toBe(false);
    server = await serveStatic(site, base);
    const images: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (/\/(png|pdf)(\/|$)/.test(new URL(request.url()).pathname)) {
        images.push(request.url());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));
    // Codex canonicalizes the directory URL without a trailing slash.
    await page.goto(`${server.url.slice(0, -1)}${route}`);
    if (process.env.STUDIO_BROWSER_SITE) {
      await expect(
        page.getByRole('complementary', { name: 'Build provenance' })
      ).toContainText(process.env.STUDIO_HEAD_SHA!);
    }
    await expect(page.locator('.monaco-editor').first()).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Web preview', exact: true })
    ).toBeVisible();
    const wasm = page.waitForResponse((response) =>
      response.url().endsWith('/assets/esbuild.wasm')
    );
    const lines = page.locator('.monaco-editor').first().locator('.view-lines');
    const original = (await lines.innerText())
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><');
    const edited = original.replace(/"[^"]*"/, '"Browser-only edit"');
    expect(edited).not.toBe(original);
    await lines.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(edited);
    expect((await wasm).ok()).toBe(true);
    await expect(page.getByTitle('HTML preview')).toContainText(
      'Browser-only edit'
    );
    await expect(page.getByRole('img', { name: 'PNG preview' })).toHaveCount(0);
    for (const mode of ['Dark', 'Light']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Web preview', exact: true })
      ).toBeVisible();
    }
    await page.goto(
      `${server.url}#/app/${process.env.STUDIO_APP_ID ?? 'decks'}/`
    );
    if (process.env.STUDIO_APP_POPOVER) {
      await expect(
        page.getByRole('button', { name: process.env.STUDIO_APP_POPOVER })
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('heading', { name: 'Decks', exact: true }).first()
      ).toBeVisible();
      await page
        .getByRole('button', { name: /Isomer: one composition, every surface/ })
        .click();
      await expect(
        page.getByRole('button', { name: 'Start', exact: true })
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /PDF/ })).toHaveCount(0);
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByRole('button', { name: /PDF/ })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: /PDF/ })).toHaveCount(0);
    expect(images).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await server?.close();
    rmSync(temporary, { force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dev hot updates image capabilities without losing the editor draft or route', async ({
  page,
}) => {
  const temporary = join(
    resolve(config, '..'),
    `.browser-hot-${process.pid}.config.ts`
  );
  const write = (images: boolean) =>
    writeFileSync(
      temporary,
      `import config from ${JSON.stringify(config)};\nexport default { ...config, images: ${images}, imageFonts: './missing-fonts-must-not-load.ts' };\n`
    );
  write(false);
  const child = spawn(
    process.execPath,
    [cli, 'dev', '--config', temporary, '--port', '0'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  try {
    await expect
      .poll(() => /Isomer Studio: (http\S+)/.exec(output)?.[1])
      .toBeTruthy();
    const url = /Isomer Studio: (http\S+)/.exec(output)![1]!;
    for (const endpoint of ['png', 'pdf']) {
      const response = await page.request.post(`${url}${endpoint}`, {
        data: '{}',
      });
      expect(response.status()).toBe(404);
      expect(await response.text()).toContain('images: false');
    }
    await page.goto(`${url}${route}`);
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible();
    await editor.locator('.view-lines').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('{"type":"invalid","draft":"preserve me"}');
    const draft = await editor.locator('.view-lines').innerText();
    write(true);
    // The enabled host advertises PNGs; this invalid draft never asks it to draw.
    await expect(
      page.getByRole('heading', { name: 'PNG', exact: true })
    ).toBeAttached();
    write(false);
    await expect(
      page.getByRole('heading', { name: 'PNG', exact: true })
    ).toHaveCount(0);
    await expect(editor.locator('.view-lines')).toHaveText(draft);
    expect(page.url()).toBe(`${url}${route}`);
    expect(readFileSync(temporary, 'utf8')).toContain('images: false');
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) {
      await once(child, 'close');
    }
    rmSync(temporary, { force: true });
  }
});
