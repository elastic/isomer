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
  test(`Metric ${mode}: mounted chart, missing readings, aligned gaps, collapse, action and invalid recovery`, async ({
    page,
  }, testInfo) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'The metric app uses its own homogeneous chart runtime, not consumer configs'
    );
    const dir = mkdtempSync(join(tmpdir(), 'isomer-metric-browser-'));
    let child: ReturnType<typeof spawn> | undefined;
    let server: Awaited<ReturnType<typeof serveStatic>> | undefined;
    const errors: string[] = [];
    const sideEffects: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        request.method() !== 'GET' ||
        /\/(_query|png|pdf)(\/|$)/.test(new URL(request.url()).pathname)
      ) {
        sideEffects.push(request.url());
      }
    });
    try {
      let url: string;
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
          { stdio: ['ignore', 'pipe', 'pipe'] }
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
        page.getByRole('heading', { name: 'Metric / trend', exact: true })
      ).toBeVisible();
      const chart = page.locator('.isomer-metric');
      await expect(
        chart.locator('[data-elastic-metric] .echMetricContainer')
      ).toBeVisible();
      await expect(chart.locator('[data-elastic-trend] canvas')).toBeVisible();
      await expect(chart.locator('[data-elastic-metric]')).toContainText('110');
      await expect(chart.locator('[data-elastic-metric]')).toContainText('+10');
      await chart.getByText('View trend data', { exact: true }).click();
      await expect(chart.getByRole('table')).toContainText('gap');
      await page.getByRole('button', { name: 'Inspect requests' }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByLabel('Metric action')).toContainText(
        '"metric":"requests"'
      );
      const editor = page.getByLabel('Metric model JSON');
      const original = await editor.inputValue();
      await editor.fill('{');
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(chart).toHaveCount(0);
      await expect(page.getByLabel('Metric action')).toHaveCount(0);
      await editor.fill(original);
      await expect(
        chart.locator('[data-elastic-metric] .echMetricContainer')
      ).toBeVisible();
      await page.getByLabel('Metric example').selectOption('1');
      await expect(chart.locator('[data-metric-key]')).toHaveCount(2);
      await expect(chart.locator('[data-metric-empty]')).toHaveCount(1);
      await expect(chart.locator('[data-metric-key="search"]')).toContainText(
        'N/A'
      );
      await expect(chart.locator('[data-metric-key="checkout"]')).toContainText(
        '99.8%'
      );
      await page.getByLabel('Metric example').selectOption('2');
      await chart.getByText('View trend data', { exact: true }).click();
      const table = chart.getByRole('table');
      await expect(table).toContainText('GMT-4');
      await expect(table.getByRole('row')).toHaveCount(4);
      await expect(table).toContainText('150 ms');
      await expect(table).toContainText('gap');
      await expect(chart.locator('.echMetricText__title')).toHaveCSS(
        'color',
        'rgb(17, 28, 44)'
      );
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await expect(chart.locator('.echMetricText__title')).toHaveCSS(
        'color',
        'rgb(17, 28, 44)'
      );
      await page.screenshot({
        path: testInfo.outputPath(`metric-${mode}-dark.png`),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Light', exact: true }).click();
      await chart.locator('[data-elastic-trend] canvas').waitFor();
      await page.screenshot({
        path: testInfo.outputPath(`metric-${mode}.png`),
        fullPage: true,
      });
      await page.getByLabel('Metric example').selectOption('3');
      await expect(chart).toContainText('sum over 2 source tiles');
      await expect(chart.locator('[data-metric-key]')).toHaveCount(1);
      await expect(chart.locator('[data-elastic-metric]')).toContainText('30');
      await page.setViewportSize({ width: 420, height: 900 });
      await expect(
        chart.locator('[data-elastic-metric] .echMetricContainer')
      ).toBeVisible();
      expect(
        await chart.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1
        )
      ).toBe(true);
      expect(errors).toEqual([]);
      expect(sideEffects).toEqual([]);
    } finally {
      if (child) {
        child.kill('SIGTERM');
        if (child.exitCode === null) {
          await once(child, 'exit');
        }
      }
      if (server) {
        await server.close();
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
