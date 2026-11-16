/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lays a grid out in Chromium, where its tracks follow the container while a
// panel's node resolves for the nominal width.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { chartsPack, chartsStylesheet } from '../src/pack';
import type { ChartsRenderContext } from '../src/render/context';
import { dataTableTopHosts } from '../src/schema/examples/data_table';
import { legacyMetricSingleValue } from '../src/schema/examples/legacy_metric';
import { metricSingleValue } from '../src/schema/examples/metric';
import type { GridNode } from '../src/schema/grid';

const linked = {
  ...metricSingleValue,
  description: 'Requests served in the last 24 hours.',
  interactions: {
    link: { href: 'https://kibana.example.com/app/lens', label: 'Open' },
  },
};

const grid: GridNode = {
  type: 'grid',
  panels: [
    { title: 'Table', x: 0, y: 0, w: 16, h: 10, node: dataTableTopHosts },
    {
      title: 'Legacy',
      x: 16,
      y: 0,
      w: 16,
      h: 10,
      node: legacyMetricSingleValue,
    },
    { title: 'Last', x: 32, y: 0, w: 16, h: 10, node: dataTableTopHosts },
    { title: 'Short', x: 0, y: 10, w: 48, h: 4, node: linked },
    { title: 'Below', x: 0, y: 14, w: 48, h: 4, node: metricSingleValue },
  ],
};

/** Draws the grid as a browser host would, in a column `width` wide. */
const show = async (
  page: Page,
  width: number,
  context: ChartsRenderContext = {}
): Promise<void> => {
  const composition: Composition = { type: 'view', body: [grid] };
  const html = renderToStaticMarkup(
    createElement(
      'main',
      { style: { width } },
      createIsomerRuntime<unknown, ChartsRenderContext>({
        packs: [chartsPack],
      }).surfaces.react.render(composition, {
        context: { environment: 'browser', ...context },
        heading: false,
      })
    )
  );
  await page.setContent(
    `<!doctype html><style>${chartsStylesheet()}</style><body style="margin:0">${html}`
  );
};

const panel = (title: string) => `section[aria-label="${title}"]`;

/** The left and right edges of a panel and of the chart drawn in it. */
const edges = (page: Page, title: string, chart: string) =>
  page.evaluate(
    ([panelSelector, chartSelector]) => {
      const section = document.querySelector(panelSelector!)!;
      const { left, right } = section.getBoundingClientRect();
      const drawn = section
        .querySelector(chartSelector!)!
        .getBoundingClientRect();
      return {
        panel: { left, right },
        chart: { left: drawn.left, right: drawn.right },
      };
    },
    [panel(title), chart]
  );

const TABLE = 'div:has(> table)';
const LEGACY = '[role="group"]';

test.describe('a grid the host gives no size', () => {
  for (const width of [600, 1400]) {
    test(`fills each panel with its table and legacy metric in a ${width} px container`, async ({
      page,
    }) => {
      await show(page, width);
      for (const [title, chart] of [
        ['Table', TABLE],
        ['Legacy', LEGACY],
        ['Last', TABLE],
      ] as const) {
        const drawn = await edges(page, title, chart);
        expect(drawn.chart.left, title).toBeCloseTo(drawn.panel.left, 0);
        expect(drawn.chart.right, title).toBeCloseTo(drawn.panel.right, 0);
      }
    });
  }

  test('clips a short panel’s content to the panel', async ({ page }) => {
    await show(page, 600);
    // Where the short panel's text shows, sampled down each line's left edge.
    const shows = await page.evaluate((selector) => {
      const section = document.querySelector(selector)!;
      const { bottom } = section.getBoundingClientRect();
      return [...section.querySelectorAll('p, a')].map((line) => {
        const rect = line.getBoundingClientRect();
        let past = false;
        for (let y = Math.max(rect.top, bottom) + 1; y < rect.bottom; y += 2) {
          const hit = document.elementFromPoint(rect.left + 2, y);
          past ||= hit !== null && section.contains(hit);
        }
        return { text: line.textContent, past };
      });
    }, panel('Short'));
    expect(shows).toHaveLength(3);
    expect(shows.filter(({ past }) => past)).toEqual([]);
  });

  test('starts the summary fallback at the top of its panel’s body', async ({
    page,
  }) => {
    await show(page, 600);
    const [header, summary] = await Promise.all([
      page.locator(`${panel('Short')} > header`).boundingBox(),
      page
        .locator(`${panel('Short')} p`)
        .first()
        .boundingBox(),
    ]);
    expect(summary!.y).toBe(header!.y + header!.height);
  });
});

test.describe('a grid the host sizes', () => {
  test('draws a table and a legacy metric at the width their panel is given', async ({
    page,
  }) => {
    // A third of 1000 px: (1000 − 47 × 8) × 16/48 + 15 × 8.
    await show(page, 600, { size: { width: 1000, height: 600 } });
    for (const [title, chart] of [
      ['Table', TABLE],
      ['Legacy', LEGACY],
    ] as const) {
      const drawn = await edges(page, title, chart);
      expect(drawn.chart.right - drawn.chart.left, title).toBe(328);
    }
  });
});
