/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lays the legacy metric renderer's tiles out in Chromium: the resolver
// estimates each tile's width from Inter's advances, and the host's font
// decides what the text needs.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { chartsPack, chartsStylesheet } from '../src/pack';
import type { ChartsRenderContext } from '../src/render/context';
import type { Cell } from '../src/schema/data';
import type { LegacyMetricNode } from '../src/schema/legacy_metric';

const legacy = (
  rows: Cell[][],
  overrides: Partial<LegacyMetricNode> = {}
): LegacyMetricNode => ({
  type: 'legacyMetric',
  data: {
    columns: [
      { id: 'host', label: 'Host', type: 'string', role: 'dimension' },
      { id: 'value', label: 'Value', type: 'string', role: 'metric' },
    ],
    rows,
  },
  metrics: [{ column: 'value' }],
  ...overrides,
});

/** Draws `node` as a browser host would, in a column `width` wide, its text in `font`. */
const show = async (
  page: Page,
  node: LegacyMetricNode,
  { width, font }: { width: number; font: string }
): Promise<void> => {
  const composition: Composition = { type: 'view', body: [node] };
  const html = renderToStaticMarkup(
    createElement(
      'main',
      { style: { width, fontFamily: font } },
      createIsomerRuntime<unknown, ChartsRenderContext>({
        packs: [chartsPack],
      }).surfaces.react.render(composition, {
        context: { environment: 'browser' },
        heading: false,
      })
    )
  );
  await page.setContent(
    `<!doctype html><style>${chartsStylesheet()}</style><body style="margin:0">${html}`
  );
};

/** Each drawn value's text: whether it shows whole, and whether its tile lies within the chart. */
const drawnValues = (page: Page) =>
  page.evaluate(() => {
    const root = document
      .querySelector('[role="group"]')!
      .getBoundingClientRect();
    return [
      ...document.querySelectorAll<HTMLElement>('[data-part="value"]'),
    ].map((value) => {
      const tile = value.closest('[data-part="tile"]')!.getBoundingClientRect();
      return {
        whole: value.scrollWidth <= value.clientWidth,
        inside:
          tile.left >= root.left - 0.5 &&
          tile.right <= root.right + 0.5 &&
          tile.top >= root.top - 0.5 &&
          tile.bottom <= root.bottom + 0.5,
      };
    });
  });

test.describe('legacy metric tiles', () => {
  test('grow to the host font’s text wider than the estimate', async ({
    page,
  }) => {
    await show(page, legacy([[null, 'iiii']], { showLabels: false }), {
      width: 480,
      font: 'monospace',
    });
    expect(await drawnValues(page)).toEqual([{ whole: true, inside: true }]);
  });

  test('wrap full-width labels into the rows the chart is sized for', async ({
    page,
  }) => {
    await show(
      page,
      legacy(
        Array.from({ length: 6 }, (_, index) => [
          `東京都渋谷区神南一丁目${index}`,
          String(index),
        ]),
        { breakdown: { column: 'host' } }
      ),
      { width: 480, font: 'sans-serif' }
    );
    const values = await drawnValues(page);
    expect(values).toHaveLength(6);
    expect(values.every(({ inside }) => inside)).toBe(true);
  });
});
