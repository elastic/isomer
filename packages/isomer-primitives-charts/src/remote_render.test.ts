/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The remote render check: takumi, with no browser, draws every example of the
// pack to PNG in both schemes and to one PDF with its fonts embedded.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import {
  createTakumiImageBackend,
  type FontLoader,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { type Composition, primitiveExamples } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { chartsFrame } from './frame';
import { chartsPack } from './pack';

const require = createRequire(import.meta.url);

const fonts: FontLoader[] = [400, 700].map((weight) => ({
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
const runtime = createIsomerRuntime({
  packs: [chartsPack],
  frames: { charts: chartsFrame },
  formats: takumi.formats,
});

const examples = chartsPack.primitives.flatMap((definition) =>
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

describe('remote render', () => {
  it('covers every primitive', () => {
    expect(new Set(examples.map(({ type }) => type))).toEqual(
      new Set(['metric', 'xyChart', 'grid', 'unsupported'])
    );
  });

  it.each(examples)(
    '$type: $name renders to PNG in light and dark',
    async ({ type, composition }) => {
      const pngs = await Promise.all(
        (['light', 'dark'] as const).map(async (theme) => {
          const input = runtime.surfaces.snapshot.render(composition, {
            theme,
          });
          if (type !== 'unsupported') {
            // Every chart, nested in a grid or not, resolves for the frame's scheme.
            expect(input.html).toContain(`data-scheme="${theme}"`);
            expect(input.html).not.toContain(
              `data-scheme="${theme === 'light' ? 'dark' : 'light'}"`
            );
          }
          const fitted = takumi.fit ? await takumi.fit(input) : input;
          const png = await takumi.png(fitted);
          expect([...png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
          expect(pngSize(png)).toEqual({
            width: fitted.width,
            height: fitted.height,
          });
          expect(fitted.height).toBeGreaterThan(0);
          return Buffer.from(png).toString('base64');
        })
      );
      expect(pngs[0]).not.toBe(pngs[1]);
    }
  );

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
});
