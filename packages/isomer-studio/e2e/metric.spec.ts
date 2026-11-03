/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';

import { examples } from '../../isomer-primitives-charts/src/metric/examples';

import { serveStatic } from './serve_static';

const root = resolve(__dirname, '../../..');
/** The text example's index in the Studio, which its painted-value tile keeps on the chart background. */
const textExample = examples.findIndex(
  ({ tiles }) => tiles[0]?.key === 'top-country'
);
const cli = join(root, 'packages/isomer-studio/bin/isomer-studio.js');
const config = join(
  root,
  'packages/isomer-renderers-elastic-charts/isomer-studio.config.ts'
);

for (const mode of ['dev', 'static']) {
  test(`Metric ${mode}: Elastic Charts tiles inline`, async ({ page }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'The charts Studio config is in this repository, not consumer configs'
    );
    const dir = mkdtempSync(join(tmpdir(), 'isomer-charts-browser-'));
    let child: ReturnType<typeof spawn> | undefined;
    let server: Awaited<ReturnType<typeof serveStatic>> | undefined;
    let url = '';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      if (mode === 'static') {
        execFileSync(
          process.execPath,
          [
            cli,
            'build',
            '--config',
            config,
            '--out',
            dir,
            '--base',
            '/charts/review/',
          ],
          { stdio: 'pipe' }
        );
        server = await serveStatic(dir, '/charts/review/');
        url = server.url;
      } else {
        child = spawn(
          process.execPath,
          [cli, 'dev', '--config', config, '--port', '0'],
          {
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        );
        let output = '';
        child.stdout?.on('data', (chunk: Buffer) => {
          output += chunk.toString();
        });
        child.stderr?.on('data', (chunk: Buffer) => {
          output += chunk.toString();
        });
        await expect
          .poll(() => /Isomer Studio: (http\S+)/.exec(output)?.[1])
          .toBeTruthy();
        url = /Isomer Studio: (http\S+)/.exec(output)![1]!;
      }
      await page.goto(`${url}#/dev/metric/0`);
      await expect(
        page.getByRole('heading', { name: 'Metric', exact: true })
      ).toBeVisible();

      // The Web card draws with React, so Elastic Charts renders inline.
      const tiles = page.locator('.echMetric');
      await expect(tiles).toHaveCount(1);
      await expect(tiles.first()).toContainText('Requests');
      await expect(tiles.first()).toContainText('182,340');
      await expect(tiles.first()).toContainText('+11.10%');
      await expect(page.locator('.echMetric svg path').first()).toBeVisible();

      // The chart follows the Studio's color mode across the shadow root.
      await page.goto(`${url}#/dev/metric/${textExample}`);
      const latency = tiles.filter({ hasText: 'p99 latency' });
      await page.locator('button#light').click();
      await expect(latency).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await page.locator('button#dark').click();
      await expect(latency).toHaveCSS('background-color', 'rgb(17, 28, 44)');

      // The renderer's own detection: an ancestor's `color-scheme`, then the OS preference.
      const chart = page.locator('.echChart');
      const setSectionStyle = (property: string, value: string) =>
        chart.evaluate(
          (element, [name, to]) =>
            element.closest('section')!.style.setProperty(name!, to!),
          [property, value]
        );
      await setSectionStyle('color-scheme', 'light');
      await expect(latency).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await page.emulateMedia({ colorScheme: 'light' });
      await setSectionStyle('color-scheme', 'normal');
      await expect(latency).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(latency).toHaveCSS('background-color', 'rgb(17, 28, 44)');
      await page.emulateMedia({ colorScheme: 'light' });

      // One row is `rowHeight` tall in an indefinite host and fits a shorter one.
      const rootSize = () =>
        chart.evaluate((element) => {
          const { clientHeight, scrollHeight } = element.closest<HTMLElement>(
            'div[style*="position: relative"]'
          )!;
          return [clientHeight, scrollHeight];
        });
      await expect.poll(rootSize).toEqual([150, 150]);
      await setSectionStyle('height', '100px');
      await expect.poll(rootSize).toEqual([100, 100]);

      expect(errors).toEqual([]);
    } finally {
      if (child) {
        const exited = once(child, 'exit');
        child.kill('SIGTERM');
        await exited;
      }
      await server?.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('Metric in the repository Studio: drawn in the slide its snapshot frame needs', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.STUDIO_CONFIG),
    'The repository Studio config is in this repository, not consumer configs'
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const child = spawn(
    process.execPath,
    [
      cli,
      'dev',
      '--config',
      join(root, 'isomer-studio.config.ts'),
      '--port',
      '0',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  try {
    await expect
      .poll(() => /Isomer Studio: (http\S+)/.exec(output)?.[1])
      .toBeTruthy();
    const url = /Isomer Studio: (http\S+)/.exec(output)![1]!;

    await page.goto(`${url}#/dev/metric/0`);
    await expect(page.locator('.echMetric')).toHaveCount(1);
    await expect(page.locator('.echMetric').first()).toContainText('182,340');
    await expect(page.getByText('Preview of metric').first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
});
