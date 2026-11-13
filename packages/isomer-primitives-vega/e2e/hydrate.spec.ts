/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';

import {
  VEGA_INTERACTIVE,
  type VegaNode,
  vegaPack,
} from '@elastic/isomer-primitives-vega';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { ActionEventRef } from '@elastic/isomer-sdk';
import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const HOVER_FILL = '#E7664C';

const node: VegaNode = {
  type: 'vega',
  id: 'errors',
  mode: 'vega-lite',
  width: 400,
  height: 240,
  description: 'Checkout errors by day.',
  data: {
    columns: [
      { id: 'day', label: 'Day', type: 'string', role: 'dimension' },
      { id: 'errors', label: 'Errors', type: 'number', role: 'metric' },
    ],
    rows: [
      ['Mon', 12],
      ['Tue', 18],
      ['Wed', 41],
    ],
  },
  interactions: { select: ['mark'] },
  spec: {
    data: { name: 'table' },
    params: [
      {
        name: 'hover',
        select: { type: 'point', on: 'pointerover', clear: 'pointerout' },
      },
    ],
    mark: { type: 'bar', tooltip: true },
    encoding: {
      x: { field: 'day', type: 'ordinal', sort: null },
      y: { field: 'errors', type: 'quantitative' },
      color: {
        condition: { param: 'hover', empty: false, value: HOVER_FILL },
        value: '#16C5C0',
      },
    },
  },
};

/** `hydrateVega` from the pack's source, as an IIFE that sets `window.IsomerVega`. */
const clientBundle = async (): Promise<string> => {
  const { outputFiles } = await build({
    entryPoints: [join(__dirname, '../src/client.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'IsomerVega',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  });
  const [file] = outputFiles;
  if (!file) {
    throw new Error('esbuild produced no client bundle');
  }
  return file.text;
};

declare global {
  interface Window {
    IsomerVega: typeof import('../src/client');
    events: ActionEventRef[];
  }
}

test('hydrates a server-rendered chart into a live view with tooltips, signals and chart events', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  const runtime = createIsomerRuntime({ packs: [vegaPack] });
  const { html } = runtime.surfaces.html.render(
    { type: 'view', body: [node] },
    { enhancements: [VEGA_INTERACTIVE] }
  );
  const script = (await clientBundle()).replace(/<\/script/gi, '<\\/script');
  await page.setContent(
    `<!doctype html><html><body>${html}<script>${script}</script></body></html>`
  );

  const chart = page.locator('[data-isomer-vega-chart]');
  const serverSvg = await chart.innerHTML();
  expect(serverSvg).toContain('<svg');

  const views = await page.evaluate(async () => {
    window.events = [];
    const { views } = await window.IsomerVega.hydrateVega(document, {
      onEvent: (event) => window.events.push(event),
    });
    return views.length;
  });
  expect(views).toBe(1);
  expect(await chart.innerHTML()).not.toBe(serverSvg);

  const bars = chart.locator('.mark-rect path');
  await expect(bars).toHaveCount(3);
  const wednesday = bars.nth(2);
  await wednesday.hover();

  const tooltip = page.locator('#vg-tooltip-element');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('Wed');
  await expect(tooltip).toContainText('41');
  await expect(wednesday).toHaveAttribute('fill', HOVER_FILL);
  await expect(bars.nth(0)).not.toHaveAttribute('fill', HOVER_FILL);

  await wednesday.click();
  await expect
    .poll(() => page.evaluate(() => window.events))
    .toEqual([
      {
        name: 'chart.select',
        context: {
          kind: 'select',
          target: 'mark',
          node: 'errors',
          rows: [2],
          columns: ['day'],
          values: { day: 'Wed' },
          description: 'Day: Wed',
        },
      },
    ]);

  expect(requests.filter((url) => !url.startsWith('about:'))).toEqual([]);
});
