/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { createElement } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createTakumiImageBackend,
  type ImageInput,
  type TakumiRenderOptions,
} from './backend';

const require = createRequire(import.meta.url);

const input = (css: string): ImageInput => ({
  element: createElement('div', { className: 'box' }, 'Ag'),
  css,
  width: 64,
  height: 32,
});

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('createTakumiImageBackend', () => {
  it('rasterizes the tree at the input viewport', async () => {
    expectTypeOf<TakumiRenderOptions>().toEqualTypeOf<{
      devicePixelRatio?: number;
    }>();

    const png = await createTakumiImageBackend().png(
      input('.box { background: #ff0000; }')
    );

    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    // IHDR carries the dimensions as big-endian u32s at a fixed offset.
    expect(png.readUInt32BE(16)).toBe(64);
    expect(png.readUInt32BE(20)).toBe(32);
  });

  it('renders the same input twice to identical bytes', async () => {
    const backend = createTakumiImageBackend();
    const first = await backend.png(input('.box { background: #ff0000; }'));
    const second = await backend.png(input('.box { background: #ff0000; }'));

    expect(first.equals(second)).toBe(true);
  });

  it('applies the stylesheet it is given', async () => {
    const backend = createTakumiImageBackend();
    const red = await backend.png(input('.box { background: #ff0000; }'));
    const blue = await backend.png(input('.box { background: #0000ff; }'));

    expect(red.equals(blue)).toBe(false);
  });

  it('preserves style end tags inside CSS', async () => {
    const backend = createTakumiImageBackend();
    const expected = await backend.png(input('.box { background: #ff0000; }'));
    const withStyleEndTag = await backend.png(
      input('.box { background: #ff0000; } /* </style> */')
    );

    expect(withStyleEndTag.equals(expected)).toBe(true);
  });

  it('raises fidelity without changing output dimensions', async () => {
    const backend = createTakumiImageBackend();
    const base = await backend.png(input('.box { background: #ff0000; }'));
    const higherDpr = await backend.png(
      input('.box { background: #ff0000; }'),
      { devicePixelRatio: 2 }
    );

    expect(higherDpr.readUInt32BE(16)).toBe(64);
    expect(higherDpr.readUInt32BE(20)).toBe(32);
    expect(higherDpr.equals(base)).toBe(false);
  });

  it('accepts cacheMaxBytes and still renders correctly across repeats', async () => {
    const backend = createTakumiImageBackend({ cacheMaxBytes: 0 });
    const first = await backend.png(input('.box { background: #ff0000; }'));
    const second = await backend.png(input('.box { background: #ff0000; }'));

    expect(first.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(first.equals(second)).toBe(true);
  });

  it('renders SVG from the same input', async () => {
    const svg = await createTakumiImageBackend().svg(
      input('.box { background: #ff0000; }')
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="64"');
  });

  it('registers a woff2 face without conversion', async () => {
    const file =
      require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2');
    const withFont = createTakumiImageBackend({
      fonts: [{ name: 'Inter', weight: 700, data: () => readFile(file) }],
    });

    const styled = await withFont.png(
      input('.box { font-family: Inter; font-weight: 700; }')
    );
    const fallback = await createTakumiImageBackend().png(
      input('.box { font-family: Inter; font-weight: 700; }')
    );

    expect(styled.equals(fallback)).toBe(false);
  });

  it('registers fonts once across renders', async () => {
    let reads = 0;
    const file =
      require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2');
    const backend = createTakumiImageBackend({
      fonts: [
        {
          name: 'Inter',
          weight: 400,
          data: () => {
            reads += 1;
            return readFile(file);
          },
        },
      ],
    });

    await backend.png(input('.box { font-family: Inter; }'));
    await backend.png(input('.box { font-family: Inter; }'));

    expect(reads).toBe(1);
  });

  it('retries font registration after a failed load', async () => {
    let reads = 0;
    const file =
      require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2');
    const backend = createTakumiImageBackend({
      fonts: [
        {
          name: 'Inter',
          weight: 400,
          data: () => {
            reads += 1;
            return reads === 1
              ? Promise.reject(new Error('transient'))
              : readFile(file);
          },
        },
      ],
    });

    await expect(
      backend.png(input('.box { font-family: Inter; }'))
    ).rejects.toThrow('transient');
    const png = await backend.png(input('.box { font-family: Inter; }'));

    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(reads).toBe(2);
  });
});
