/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcess } from 'node:child_process';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { serveStatic } from './serve_static';

const root = resolve(__dirname, '../../..');
const cli = join(root, 'packages/isomer-studio/bin/isomer-studio.js');
const config = join(root, 'isomer-studio.config.ts');
const base = '/lens-chart/review/';

const startDev = async (): Promise<{ url: string; child: ChildProcess }> => {
  const child = spawn(
    process.execPath,
    [cli, 'dev', '--config', config, '--port', '0'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  await expect
    .poll(() => /Isomer Studio: (http\S+)/.exec(output)?.[1])
    .toBeTruthy();
  return { url: /Isomer Studio: (http\S+)/.exec(output)![1]!, child };
};

const LABEL =
  'Synthetic data: demonstrates lowering, binding, and presentation; does not execute or verify queries.';

/** The text of every tile the chart drew, from Elastic Charts' own markup in the preview's shadow root. */
const tileTexts = (page: Page) =>
  page.evaluate(() => {
    const hosts = [...document.querySelectorAll('*')].filter(
      (element) => element.shadowRoot
    );
    return hosts.flatMap((host) =>
      [...host.shadowRoot!.querySelectorAll('.echMetric')].map((tile) =>
        (tile as HTMLElement).innerText.replace(/\s+/g, ' ').trim()
      )
    );
  });

const exercise = async (page: Page, url: string) => {
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    const { origin, pathname } = new URL(request.url());
    if (origin !== new URL(url).origin || /\/(png|pdf)(\/|$)/.test(pathname)) {
      foreign.push(request.url());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${url}#/app/lens-chart/`);
  await expect(
    page.getByRole('heading', { name: 'Lens to chart' })
  ).toBeVisible();
  await expect(page.getByRole('note')).toHaveText(LABEL);

  // The "[Flights] Total flights" sample: a form-based count, read back through readTable.
  await expect
    .poll(() => tileTexts(page))
    .toEqual([expect.stringMatching(/^Total flights \d[\d,]*$/)]);
  await expect(page.getByLabel('Composition JSON')).toContainText(
    '"title": "Total flights"'
  );

  // The chart follows the Studio's color mode.
  const tileElements = page.locator('.echMetric');
  await page.locator('button#light').click();
  await expect(tileElements.first()).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  );
  await page.locator('button#dark').click();
  await expect(tileElements.first()).toHaveCSS(
    'background-color',
    'rgb(17, 28, 44)'
  );

  const sample = page.getByLabel('Sample');
  await sample.selectOption('flights-delayed');
  await expect
    .poll(() => tileTexts(page))
    .toEqual([expect.stringMatching(/^Delayed \d+\.\d%$/)]);

  await sample.selectOption('bytes-by-host');
  await expect
    .poll(() => tileTexts(page))
    .toEqual([
      expect.stringMatching(
        /^Category A Bytes Last week [+-][\d.]+[KM]?B [↑↓=] [\d.]+[KM]?B$/
      ),
      expect.stringMatching(/^Category B /),
      expect.stringMatching(/^Category C /),
    ]);
  const composition = JSON.parse(
    (await page.getByLabel('Composition JSON').textContent())!
  ) as {
    body: [
      {
        tiles: {
          value: number;
          color: { palette: string; step: number; of: number };
          visual: { kind: string };
        }[];
      },
    ];
  };
  // A percent-range status palette over the breakdown's own range: its smallest reading
  // takes the first band and its largest the last.
  const { tiles } = composition.body[0];
  expect(
    tiles.every(({ color }) => color.palette === 'status' && color.of === 3)
  ).toBe(true);
  const byValue = [...tiles].sort((a, b) => a.value - b.value);
  expect([byValue[0]!.color.step, byValue.at(-1)!.color.step]).toEqual([0, 2]);
  expect(tiles.every(({ visual }) => visual.kind === 'trend')).toBe(true);

  await sample.selectOption('flights-by-carrier');
  await expect
    .poll(() => tileTexts(page))
    .toEqual([
      expect.stringMatching(/^Category A Flights \d+$/),
      expect.stringMatching(/^Category B Flights \d+$/),
      expect.stringMatching(/^Category C Flights \d+$/),
      expect.stringMatching(/^Other Flights \d+$/),
    ]);

  // A form-based trendline is a layer Lens links to the main one.
  await sample.selectOption('flights-trend');
  await expect
    .poll(() => tileTexts(page))
    .toEqual([
      expect.stringMatching(
        /^Average ticket price Across all carriers [\d,]+\.\d{2} USD$/
      ),
    ]);
  await expect(page.locator('.echMetric svg path').first()).toBeVisible();

  // A saved state Lens does not define is refused with its path, never drawn.
  const input = page.getByLabel('Lens saved object');
  const saved = JSON.parse(await input.inputValue()) as {
    savedObject: {
      attributes: { state: { visualization: Record<string, unknown> } };
    };
  };
  saved.savedObject.attributes.state.visualization.futureOption = true;
  await input.fill(JSON.stringify(saved));
  await page.getByRole('button', { name: 'Convert' }).click();
  await expect(page.getByRole('alert', { name: 'Diagnostics' })).toContainText(
    'lens.metric.unsupported-state at plan.source.attributes.state.visualization'
  );
  await expect.poll(() => tileTexts(page)).toEqual([]);

  await input.fill('{ not json');
  await page.getByRole('button', { name: 'Convert' }).click();
  await expect(page.getByRole('alert')).toContainText('The input is not JSON');

  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
};

test.describe('Lens to chart', () => {
  test.skip(
    Boolean(process.env.STUDIO_CONFIG),
    'The Lens to chart app is in the repository config, not consumer configs'
  );

  test('binds pasted Lens to synthetic data and draws it in dev', async ({
    page,
  }) => {
    const dev = await startDev();
    try {
      await exercise(page, dev.url);
    } finally {
      dev.child.kill('SIGTERM');
      if (dev.child.exitCode === null) {
        await once(dev.child, 'close');
      }
    }
  });

  test('binds pasted Lens to synthetic data and draws it in a static build', async ({
    page,
  }) => {
    const dir = mkdtempSync(join(tmpdir(), 'isomer-lens-chart-'));
    try {
      execFileSync(
        process.execPath,
        [cli, 'build', '--config', config, '--out', dir, '--base', base],
        {
          stdio: 'pipe',
        }
      );
      const server = await serveStatic(dir, base);
      try {
        await exercise(page, server.url);
      } finally {
        await server.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
