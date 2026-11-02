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
  test(`Lens inspector ${mode}: envelope diagnostics, multilayer projection and stale-result recovery`, async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.STUDIO_CONFIG),
      'The Lens app is in the repository shared config, not consumer configs'
    );
    const dir = mkdtempSync(join(tmpdir(), 'isomer-lens-browser-'));
    let child: ReturnType<typeof spawn> | undefined;
    let server: Awaited<ReturnType<typeof serveStatic>> | undefined;
    let url = '';
    const errors: string[] = [];
    const executionRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        request.method() !== 'GET' ||
        /\/(_query|png|pdf)(\/|$)/.test(new URL(request.url()).pathname)
      ) {
        executionRequests.push(request.url());
      }
    });
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
            '/lens/review/',
          ],
          { stdio: 'pipe' }
        );
        server = await serveStatic(dir, '/lens/review/');
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
      await page.goto(`${url}#/app/lens/`);
      await expect(
        page.getByRole('heading', { name: 'Lens inspector', exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(/Local response replay is not backend execution parity/)
      ).toBeVisible();
      const input = page.getByLabel('Planning input JSON');
      const original: unknown = JSON.parse(await input.inputValue());
      await page
        .getByRole('button', { name: 'Inspect envelope', exact: true })
        .click();
      const result = page.getByLabel('Planning result');
      await expect(result).toContainText('"status": "planned"');
      await page
        .getByRole('button', { name: 'Inspect response', exact: true })
        .click();
      const projected = page.getByLabel('Response result');
      await expect(projected).toContainText('"status": "ready"');
      const projection: unknown = JSON.parse(await projected.innerText());
      expect(projection).toMatchObject({
        table: {
          rows: [
            [42, 'checkout'],
            [null, 'search'],
          ],
        },
      });

      await page.getByLabel('ES|QL response JSON').fill('{');
      await expect(projected).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Inspect response', exact: true })
        .click();
      await expect(page.getByRole('alert')).toBeVisible();
      await page.getByLabel('ES|QL response JSON').fill(
        JSON.stringify({
          columns: [{ name: 'requests', type: 'integer' }],
          values: [[42]],
          is_partial: true,
        })
      );
      await page
        .getByRole('button', { name: 'Inspect response', exact: true })
        .click();
      await expect(projected).toContainText('lens.response.incomplete');
      await expect(projected).toContainText('lens.response.missing-column');

      const multilayer = {
        savedObject: {
          id: 'multi',
          type: 'lens',
          references: [],
          attributes: {
            title: 'Two layers',
            visualizationType: 'lnsXY',
            state: {
              visualization: {},
              datasourceStates: {
                textBased: {
                  layers: {
                    first: {
                      query: { esql: 'ROW total = 1' },
                      columns: [{ columnId: 'total-id', fieldName: 'total' }],
                    },
                    second: {
                      query: { esql: 'ROW service = "search"' },
                      columns: [
                        { columnId: 'service-id', fieldName: 'service' },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      };
      await input.fill(JSON.stringify(multilayer));
      await expect(result).toHaveCount(0);
      await expect(projected).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Inspect envelope', exact: true })
        .click();
      await expect(result).toContainText('ROW total = 1');
      await expect(result).toContainText('ROW service');
      await page
        .getByLabel('ES|QL response JSON')
        .fill('{"columns":[{"name":"total","type":"long"}],"values":[[7]]}');
      await page
        .getByRole('button', { name: 'Inspect response', exact: true })
        .click();
      await expect(projected).toContainText('"status": "ready"');
      await page.getByLabel('Response layer').selectOption('second');
      await expect(projected).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Inspect response', exact: true })
        .click();
      await expect(projected).toContainText('lens.response.missing-column');

      await input.fill(
        JSON.stringify({
          savedObject: {
            ...multilayer.savedObject,
            attributes: {
              ...multilayer.savedObject.attributes,
              state: {
                ...multilayer.savedObject.attributes.state,
                datasourceStates: { formBased: {} },
              },
            },
          },
        })
      );
      await page
        .getByRole('button', { name: 'Inspect envelope', exact: true })
        .click();
      await expect(result).toContainText('"status": "unsupported"');
      await expect(
        page.getByRole('button', { name: 'Inspect response', exact: true })
      ).toHaveCount(0);
      await input.fill('{');
      await page
        .getByRole('button', { name: 'Inspect envelope', exact: true })
        .click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(result).toHaveCount(0);
      await input.fill(JSON.stringify(original));
      await page
        .getByRole('button', { name: 'Inspect envelope', exact: true })
        .click();
      await expect(result).toContainText('"status": "planned"');
      expect(executionRequests).toEqual([]);
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
