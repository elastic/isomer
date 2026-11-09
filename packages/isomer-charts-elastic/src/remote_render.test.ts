/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The remote render check: with no browser, the charts pack draws every example
// through the headless Elastic Charts engine, and takumi rasterizes it to PNG in
// both schemes and to one PDF with its fonts embedded.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import {
  createTakumiImageBackend,
  type FontLoader,
} from '@elastic/isomer-image-takumi';
import {
  chartsFrame,
  createChartsPack,
  metricExamples,
} from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type { ColorScheme } from '@elastic/isomer-primitives-charts/scene';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { type Composition, primitiveExamples } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createElasticChartsHeadlessRenderer } from './headless';

const require = createRequire(import.meta.url);

// Inter at the weights Elastic Charts and the pack draw with.
const fonts: FontLoader[] = [400, 500, 600, 700].map((weight) => ({
  name: 'Inter',
  weight,
  style: 'normal',
  data: () =>
    readFile(
      require.resolve(
        `@fontsource/inter/files/inter-latin-${weight}-normal.woff2`
      )
    ),
}));

const takumi = createTakumiImageBackend({ fonts });
const pack = createChartsPack({
  sceneRenderers: [createElasticChartsHeadlessRenderer()],
});
const runtime = createIsomerRuntime({
  packs: [pack],
  frames: { charts: chartsFrame },
  formats: takumi.formats,
});

// The chart background each scheme resolves to.
const background = (scheme: ColorScheme) =>
  resolveChart(metricExamples[0]!.node, { scheme }).chrome.background;

const examples = pack.primitives.flatMap((definition) =>
  primitiveExamples(definition).map(({ name, node }) => {
    const composition: Composition = { type: 'view', body: [node] };
    return { type: definition.type, name: name ?? '(unnamed)', composition };
  })
);

/** Width and height from a PNG's IHDR chunk. */
const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The background each chart SVG paints first, from Elastic Charts' `toSvg`. */
const svgBackgrounds = (html: string): string[] =>
  html
    .split('<svg ')
    .slice(1)
    .flatMap((svg) => {
      const fill = /<rect width="[^"]*" height="[^"]*" fill="([^"]*)"\/>/.exec(
        svg
      )?.[1];
      return fill === undefined ? [] : [fill];
    });

/** The HTML with every top-level `<svg>` element removed. */
const withoutSvgs = (html: string): string => {
  let out = '';
  let depth = 0;
  let index = 0;
  const tag = /<svg[\s>]|<\/svg>/g;
  for (let match = tag.exec(html); match; match = tag.exec(html)) {
    const opens = match[0] !== '</svg>';
    if (opens && depth++ === 0) {
      out += html.slice(index, match.index);
    }
    if (!opens && --depth === 0) {
      index = match.index + match[0].length;
    }
  }
  return out + html.slice(index);
};

const OTHER: Record<ColorScheme, ColorScheme> = {
  light: 'dark',
  dark: 'light',
};

describe('remote render with headless Elastic Charts', () => {
  it('covers every primitive', () => {
    expect(new Set(examples.map(({ type }) => type))).toEqual(
      new Set(['metric', 'xyChart', 'dataTable', 'grid', 'unsupported'])
    );
  });

  it.each(examples)(
    '$type: $name renders to PNG in light and dark',
    async ({ composition }) => {
      const pngs = await Promise.all(
        (['light', 'dark'] as const).map(async (theme) => {
          const input = runtime.surfaces.snapshot.render(composition, {
            theme,
          });
          // Every chart, nested in a grid or not, draws for the frame's scheme.
          for (const fill of svgBackgrounds(input.html)) {
            expect(fill).toBe(background(theme));
            expect(fill).not.toBe(background(OTHER[theme]));
          }
          const fitted = takumi.fit ? await takumi.fit(input) : input;
          const png = await takumi.png(fitted);
          expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
          expect(pngSize(png)).toEqual({
            width: fitted.width,
            height: fitted.height,
          });
          expect(fitted.height).toBeGreaterThan(0);
          if (svgBackgrounds(input.html).length > 0) {
            // The charts reach the raster: without their SVG it differs.
            const bare = await takumi.png({
              ...fitted,
              html: withoutSvgs(fitted.html),
            });
            expect(Buffer.from(bare).equals(Buffer.from(png))).toBe(false);
          }
          return Buffer.from(png).toString('base64');
        })
      );
      expect(pngs[0]).not.toBe(pngs[1]);
    }
  );

  it('draws every metric and xy chart as Elastic Charts SVG', () => {
    for (const { type, composition } of examples) {
      if (type === 'metric' || type === 'xyChart') {
        const { html } = runtime.surfaces.snapshot.render(composition, {
          theme: 'light',
        });
        expect(svgBackgrounds(html).length).toBeGreaterThan(0);
      }
    }
  });

  it('renders every example to one PDF, a page each, with its fonts embedded', async () => {
    const pages = runtime.surfaces.snapshot.renderPages(
      examples.map(({ composition }) => composition)
    );
    const pdf = Buffer.from(await takumi.pdf(pages)).toString('latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(examples.length);
    expect(pdf).toMatch(/\/FontFile[23]?\b/);
    expect(pdf).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+Inter/);
  });

  it('draws the charts into the PDF: without their SVG it differs', async () => {
    const pages = runtime.surfaces.snapshot.renderPages(
      examples
        .filter(({ type }) => type === 'metric' || type === 'xyChart')
        .map(({ composition }) => composition)
    );
    const options = { metadata: { creationDate: '2026-01-01' } };
    const pdf = (input: typeof pages) =>
      takumi.pdf(input, options).then((bytes) => Buffer.from(bytes));
    const [drawn, again, bare] = await Promise.all([
      pdf(pages),
      pdf(pages),
      pdf({
        ...pages,
        pages: pages.pages.map((page) => ({
          ...page,
          html: withoutSvgs(page.html),
        })),
      }),
    ]);
    expect(drawn.equals(again)).toBe(true);
    expect(drawn.equals(bare)).toBe(false);
  });
});
