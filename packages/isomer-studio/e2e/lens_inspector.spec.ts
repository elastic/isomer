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
const base = '/lens/review/';

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

const responseText = (rows: unknown[][], extra: object = {}) =>
  JSON.stringify({
    columns: [
      { name: 'requests', type: 'long' },
      { name: 'service.name', type: 'keyword' },
    ],
    values: rows,
    ...extra,
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

  await page.goto(`${url}#/app/lens/`);
  await expect(
    page.getByRole('heading', { name: 'Lens inspector' })
  ).toBeVisible();
  const input = page.getByLabel(/Planning input/);
  const original = await input.inputValue();

  await input.fill('{ not json');
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  const formBased = JSON.parse(original) as {
    savedObject: { attributes: { state: { datasourceStates: object } } };
  };
  formBased.savedObject.attributes.state.datasourceStates = { formBased: {} };
  await input.fill(JSON.stringify(formBased));
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.getByText('Status: unsupported')).toBeVisible();
  await expect(page.getByRole('alert', { name: 'Diagnostics' })).toContainText(
    'lens.unsupported-datasource at savedObject.attributes.state.datasourceStates'
  );

  await input.fill(original);
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.getByText('Status: planned, 2 layers')).toBeVisible();
  await expect(page.getByLabel('Query')).toContainText(
    '@timestamp >= ?_tstart'
  );
  await expect(page.getByLabel('Layer plan')).toContainText(
    '"params": [\n    "_tstart",\n    "_tend"\n  ]'
  );

  const read = page.getByRole('button', { name: 'Read response' });
  const table = page.getByRole('table', { name: 'Projected table' });
  await read.click();
  await expect(table.getByRole('row')).toHaveText([
    /Requests/,
    /"checkout"\s*42/,
    /"search"\s*null/,
  ]);

  const response = page.getByLabel(/Recorded ES\|QL response/);
  await response.fill(responseText([[1, 'a']], { is_partial: true }));
  await expect(table).toHaveCount(0);
  await read.click();
  await expect(page.getByRole('alert', { name: 'Diagnostics' })).toContainText(
    'lens.response.incomplete at response.is_partial'
  );

  await response.fill(responseText(Array.from({ length: 120 }, () => [1])));
  await read.click();
  const diagnostics = page.getByRole('alert', { name: 'Diagnostics' });
  await expect(diagnostics.getByRole('listitem')).toHaveCount(51);
  await expect(diagnostics).toContainText('and 70 more');

  const long = 'x'.repeat(5000);
  await response.fill(
    responseText(Array.from({ length: 60 }, (_, index) => [index, long]))
  );
  await read.click();
  await expect(page.getByText('Showing 50 of 60 rows.')).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(51);
  await expect(table.getByRole('cell').nth(0)).toContainText('more characters');

  await page.getByLabel('Layer', { exact: true }).selectOption('layer2');
  await expect(table).toHaveCount(0);
  await expect(page.getByLabel('Query')).toContainText('FROM traces-*');

  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
};

test.describe('Lens inspector', () => {
  test.skip(
    Boolean(process.env.STUDIO_CONFIG),
    'The Lens inspector is in the repository config, not consumer configs'
  );

  test('plans, projects and reports diagnostics in dev', async ({ page }) => {
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

  test('plans, projects and reports diagnostics in a static build', async ({
    page,
  }) => {
    const dir = mkdtempSync(join(tmpdir(), 'isomer-lens-inspector-'));
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
