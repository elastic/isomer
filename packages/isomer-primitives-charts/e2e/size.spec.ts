/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lays the shim's size spec out in Chromium: a renderer that fills its
// container draws nothing unless the container has a box.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { chartsPack, createChartsPack } from '../src/pack';
import type {
  ChartsRenderContext,
  ReactSceneRenderer,
} from '../src/render/context';
import { metricSingleValue } from '../src/schema/examples/metric';
import { xyTimeSeries } from '../src/schema/examples/xy_chart';

const filling: ReactSceneRenderer = {
  id: 'filling',
  environments: ['browser'],
  fluid: true,
  supports: (kind) => kind === 'metric' || kind === 'xy',
  render: ({ kind }) =>
    createElement('div', {
      'data-drawn': kind,
      style: { width: '100%', height: '100%' },
    }),
};

const composition: Composition = {
  type: 'view',
  body: [metricSingleValue, xyTimeSeries],
};

/** Draws `composition` with `pack` as a browser host would, in a column `width` wide. */
const show = async (
  page: Page,
  pack: typeof chartsPack,
  width: number
): Promise<void> => {
  const html = renderToStaticMarkup(
    createElement(
      'main',
      { style: { width } },
      createIsomerRuntime<unknown, ChartsRenderContext>({
        packs: [pack],
      }).surfaces.react.render(composition, {
        context: { environment: 'browser' },
        heading: false,
      })
    )
  );
  await page.setContent(`<!doctype html><body style="margin:0">${html}`);
};

const box = async (page: Page, selector: string) => {
  const rect = await page.locator(selector).boundingBox();
  expect(rect).not.toBeNull();
  return { width: rect!.width, height: rect!.height };
};

test.describe('a chart outside a sized container', () => {
  const pack = createChartsPack({ sceneRenderers: [filling] });

  test('gives a renderer that fills its container a time chart 16:9, at least 300 px tall', async ({
    page,
  }) => {
    await show(page, pack, 400);
    expect(await box(page, '[data-drawn="xy"]')).toEqual({
      width: 400,
      height: 300,
    });
    await show(page, pack, 960);
    expect(await box(page, '[data-drawn="xy"]')).toEqual({
      width: 960,
      height: 540,
    });
  });

  test('gives it one metric tile at 300:160, at most 300 px wide', async ({
    page,
  }) => {
    await show(page, pack, 960);
    expect(await box(page, '[data-drawn="metric"]')).toEqual({
      width: 300,
      height: 160,
    });
    await show(page, pack, 150);
    expect(await box(page, '[data-drawn="metric"]')).toEqual({
      width: 150,
      height: 80,
    });
  });

  test('leaves the summary fallback its own height', async ({ page }) => {
    await show(page, chartsPack, 960);
    const summaries = page.locator('main div:has(> p)');
    await expect(summaries).toHaveCount(2);
    for (const summary of await summaries.all()) {
      expect((await summary.boundingBox())!.height).toBeLessThan(300);
    }
  });
});
