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

import { serveStatic } from './serve_static';

const root = resolve(__dirname, '../../..');
const cli = join(root, 'packages/isomer-studio/bin/isomer-studio.js');
const config = join(root, 'isomer-studio.config.ts');

for (const mode of ['dev', 'static']) {
  test(`Metric ${mode}: Elastic Charts tiles, actions and validation`, async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'The metric app is in the repository shared config, not consumer configs'
    );
    const dir = mkdtempSync(join(tmpdir(), 'isomer-metric-browser-'));
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
            '/metric/review/',
          ],
          { stdio: 'pipe' }
        );
        server = await serveStatic(dir, '/metric/review/');
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
      await page.goto(`${url}#/app/metric/`);
      await expect(
        page.getByRole('heading', { name: 'Metric', exact: true })
      ).toBeVisible();

      const tiles = page.locator('.echMetric');
      await expect(tiles).toHaveCount(1);
      await expect(tiles.first()).toContainText('Requests');
      await expect(tiles.first()).toContainText('182,340');
      await expect(tiles.first()).toContainText('+11.10%');
      await expect(page.locator('.echMetric svg path').first()).toBeVisible();

      // The pack's renderer follows the host's `color-scheme` as it changes.
      await expect(tiles.first()).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)'
      );
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(tiles.first()).toHaveCSS(
        'background-color',
        'rgb(17, 28, 44)'
      );
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(tiles.first()).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)'
      );
      await page
        .locator('.echChart')
        .evaluate((chart) =>
          chart
            .closest<HTMLElement>('[style*="color-scheme"]')!
            .style.setProperty('color-scheme', 'dark')
        );
      await expect(tiles.first()).toHaveCSS(
        'background-color',
        'rgb(17, 28, 44)'
      );

      await page.getByLabel('Example').selectOption({ index: 1 });
      await expect(tiles).toHaveCount(3);
      await tiles.filter({ hasText: 'web-02' }).click();
      const action: unknown = JSON.parse(
        await page.getByLabel('Metric action').innerText()
      );
      expect(action).toEqual({
        name: 'dashboard/filter',
        context: {
          key: 'web-02',
          filters: [{ field: 'host.name', value: 'web-02' }],
        },
      });

      await page.getByLabel('Metric JSON').fill(
        JSON.stringify({
          type: 'metric',
          tiles: [
            {
              key: 'a',
              value: 'x',
              secondary: { kind: 'change', previous: 1 },
            },
          ],
        })
      );
      await expect(page.getByRole('alert')).toContainText(
        'tiles.0.secondary: a `change` needs a numeric `value`'
      );
      await expect(tiles).toHaveCount(0);

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
