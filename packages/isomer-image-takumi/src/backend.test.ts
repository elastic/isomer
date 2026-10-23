/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';

import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createTakumiImageBackend,
  type ImageInput,
  type PdfInput,
  type TakumiPdfMetadata,
  type TakumiPdfOptions,
  type TakumiRenderOptions,
} from './backend';

const require = createRequire(import.meta.url);

const input = (css: string): ImageInput => ({
  html: '<div class="box">Ag</div>',
  css,
  width: 64,
  height: 32,
});

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const paeth = (left: number, up: number, upLeft: number) => {
  const estimate = left + up - upLeft;
  const [toLeft, toUp, toUpLeft] = [left, up, upLeft].map((value) =>
    Math.abs(estimate - value)
  ) as [number, number, number];
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
};

/** Decodes the PNGs takumi writes: 8-bit, non-interlaced, RGB or RGBA. */
const decodePng = (png: Buffer) => {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const channels = png.readUInt8(25) === 6 ? 4 : 3;
  const data: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString('latin1', offset + 4, offset + 8) === 'IDAT') {
      data.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const filtered = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = filtered.readUInt8(y * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left =
        x >= channels ? pixels.readUInt8(y * stride + x - channels) : 0;
      const up = y > 0 ? pixels.readUInt8((y - 1) * stride + x) : 0;
      const upLeft =
        x >= channels && y > 0
          ? pixels.readUInt8((y - 1) * stride + x - channels)
          : 0;
      const predicted = [
        0,
        left,
        up,
        (left + up) >> 1,
        paeth(left, up, upLeft),
      ][filter];
      pixels.writeUInt8(
        (filtered.readUInt8(y * (stride + 1) + 1 + x) + (predicted ?? 0)) &
          0xff,
        y * stride + x
      );
    }
  }
  const pixel = (x: number, y: number) => {
    const at = (y * width + x) * channels;
    return {
      r: pixels.readUInt8(at),
      g: pixels.readUInt8(at + 1),
      b: pixels.readUInt8(at + 2),
    };
  };
  return { width, height, pixels, pixel };
};

describe('createTakumiImageBackend', () => {
  it('rasterizes the tree at the input viewport', async () => {
    expectTypeOf<TakumiRenderOptions>().toEqualTypeOf<{
      scale?: number;
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

  it('zooms at devicePixelRatio without changing output dimensions', async () => {
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

  describe('scale', () => {
    const css = '.box { width: 40px; background: #ff0000; }';

    it.each([
      ['a plain stylesheet', css],
      ['universal padding', `* { padding: 4px } ${css}`],
      ['compounding em', `* { font-size: 1.5em } ${css}`],
      ['structural selectors', `:first-child { margin-left: 6px } ${css}`],
    ])(
      'multiplies the raster and keeps the layout under %s',
      async (_, sheet) => {
        const backend = createTakumiImageBackend();
        const scaled = await backend.png(input(sheet), { scale: 2 });
        const doubledViewport = await backend.png(
          { ...input(sheet), width: 128, height: 64 },
          { devicePixelRatio: 2 }
        );

        expect(scaled.readUInt32BE(16)).toBe(128);
        expect(scaled.readUInt32BE(20)).toBe(64);
        expect(decodePng(scaled).pixels).toEqual(
          decodePng(doubledViewport).pixels
        );
      }
    );

    describe.each([
      ['fixed in CSS pixels', (w: number, h: number) => `${w}px;height:${h}px`],
      ['sized to the viewport', () => '100%;height:100%'],
    ])('keeps a root %s whole', (_, size) => {
      it.each([
        [64, 32, 2],
        [63, 31, 1.5],
        [3, 100, 1.5],
        [101, 2000, 1.5],
      ])('at %d × %d, scale %d', async (width, height, scale) => {
        const edges: ImageInput = {
          html: `<div class="root" style="width:${size(width, height)}"><div class="bottom"></div><div class="right"></div></div>`,
          css: '.root { position: relative; background: #ff0000 } .bottom, .right { position: absolute; right: 0; bottom: 0; background: #0000ff } .bottom { left: 0; height: 1px } .right { top: 0; width: 1px }',
          width,
          height,
        };
        const png = decodePng(
          await createTakumiImageBackend().png(edges, { scale })
        );
        const isBlue = ({ r, b }: { r: number; b: number }) => b > r;

        expect(isBlue(png.pixel(0, png.height - 1))).toBe(true);
        expect(isBlue(png.pixel(png.width - 1, 0))).toBe(true);
      });
    });

    it('leaves the bytes unchanged at 1', async () => {
      const backend = createTakumiImageBackend();
      const base = await backend.png(input(css));
      const unscaled = await backend.png(input(css), { scale: 1 });

      expect(unscaled.equals(base)).toBe(true);
    });

    it.each([
      [63, 31, 95, 47],
      [3, 100, 5, 150],
    ])(
      'rounds %d × %d at 1.5 to %d × %d',
      async (width, height, rasterWidth, rasterHeight) => {
        const png = await createTakumiImageBackend().png(
          { ...input(css), width, height },
          { scale: 1.5 }
        );

        expect(png.readUInt32BE(16)).toBe(rasterWidth);
        expect(png.readUInt32BE(20)).toBe(rasterHeight);
      }
    );

    it('composes with devicePixelRatio', async () => {
      const backend = createTakumiImageBackend();
      const both = await backend.png(input(css), {
        scale: 2,
        devicePixelRatio: 2,
      });
      const doubledViewport = await backend.png(
        { ...input(css), width: 128, height: 64 },
        { devicePixelRatio: 4 }
      );

      expect(decodePng(both).pixels).toEqual(decodePng(doubledViewport).pixels);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects %s',
      async (scale) => {
        await expect(
          createTakumiImageBackend().png(input(css), { scale })
        ).rejects.toThrow(RangeError);
      }
    );
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

  describe('measure', () => {
    const measure = (element: ReactElement, css: string) =>
      createTakumiImageBackend().measure({
        html: renderToStaticMarkup(element),
        css,
        width: 200,
        height: 100,
      });

    it('nests boxes inside a root the size of the png canvas', async () => {
      const twoBoxes: ImageInput = {
        html: '<div class="outer"><div class="inner">Ag</div><div class="inner">Ag</div></div>',
        css: '.outer { width: 64px; height: 32px; padding: 4px 6px; box-sizing: border-box; display: flex; gap: 2px } .inner { width: 20px; height: 10px }',
        width: 64,
        height: 32,
      };
      const takumi = createTakumiImageBackend();
      const png = await takumi.png(twoBoxes);
      const box = await takumi.measure(twoBoxes);

      expect(box).toMatchObject({
        x: 0,
        y: 0,
        width: png.readUInt32BE(16),
        height: png.readUInt32BE(20),
      });
      expect(box.children).toMatchObject([
        { x: 6, y: 4, width: 20, height: 10 },
        { x: 28, y: 4, width: 20, height: 10 },
      ]);
      const [run] = box.children[0]?.runs ?? [];
      expect(run).toMatchObject({ text: 'Ag', x: 6 });
      expect(run?.y).toBeCloseTo(4, 0);
    });

    describe('maps a transformed box and its text to the canvas', () => {
      const transformed = (transform: string) =>
        measure(
          createElement(
            'div',
            { className: 'outer' },
            createElement('div', { className: 'inner' }, 'Ag')
          ),
          `.outer { width: 200px; height: 100px; padding: 10px 20px; box-sizing: border-box; display: flex } .inner { width: 40px; height: 20px; transform-origin: 0 0; transform: ${transform} }`
        );

      const unscaled = { scale: 1, scaleX: 1, scaleY: 1 };
      it.each([
        ['none', { x: 20, y: 10, width: 40, height: 20, ...unscaled }, 20],
        [
          'scale(2)',
          {
            x: 20,
            y: 10,
            width: 80,
            height: 40,
            scale: 2,
            scaleX: 2,
            scaleY: 2,
          },
          20,
        ],
        [
          'scale(1, 0.5)',
          {
            x: 20,
            y: 10,
            width: 40,
            height: 10,
            scale: 0.5,
            scaleX: 1,
            scaleY: 0.5,
          },
          20,
        ],
        [
          'translate(10px, 5px)',
          { x: 30, y: 15, width: 40, height: 20, ...unscaled },
          30,
        ],
        // A quarter turn about the top left swings the box left of its origin and swaps its sides.
        [
          'rotate(90deg)',
          { x: 0, y: 10, width: 20, height: 40, ...unscaled },
          -0.7,
        ],
      ] as const)('%s', async (transform, bounds, runX) => {
        const [inner] = (await transformed(transform)).children;
        for (const [key, value] of Object.entries(bounds)) {
          expect(inner?.[key as keyof typeof bounds]).toBeCloseTo(value, 3);
        }
        const [run] = inner?.runs ?? [];
        expect(run?.text).toBe('Ag');
        expect(run?.x).toBeCloseTo(runX, 0);
      });

      it('scales a text run with its box', async () => {
        const [plain] = (await transformed('none')).children;
        const [scaled] = (await transformed('scale(2)')).children;
        expect(scaled?.runs[0]?.width).toBeCloseTo(
          2 * (plain?.runs[0]?.width ?? 0),
          3
        );
        expect(scaled?.runs[0]?.height).toBeCloseTo(
          2 * (plain?.runs[0]?.height ?? 0),
          3
        );
      });
    });

    it('carries each element’s attributes onto its box', async () => {
      const box = await measure(
        createElement(
          'div',
          { className: 'row', 'data-isomer-node': 'row' },
          createElement(
            'div',
            { id: 'first', 'data-isomer-node': 'item', 'aria-label': 'First' },
            'a'
          ),
          'loose text',
          createElement('div', null, createElement('b', null, 'b'))
        ),
        '.row { display: flex }'
      );

      expect(box.attributes).toEqual({ 'data-isomer-node': 'row' });
      expect(box.children.map(({ attributes }) => attributes)).toEqual([
        { 'data-isomer-node': 'item', 'aria-label': 'First' },
        undefined,
        undefined,
      ]);
    });

    it('drops attributes where inline content folds children together', async () => {
      const box = await measure(
        createElement(
          'div',
          null,
          'before ',
          createElement('span', { 'data-isomer-node': 'chip' }, 'chip'),
          createElement('div', { 'data-isomer-node': 'block' }, 'block'),
          ' after'
        ),
        ''
      );

      expect(box.children).not.toHaveLength(4);
      expect(box.children.every(({ attributes }) => !attributes)).toBe(true);
    });
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

  describe('pdf', () => {
    const pages = (
      texts: readonly string[],
      css = '.box { background: #ff0000; }'
    ): PdfInput => ({
      pages: texts.map((text) => ({
        html: renderToStaticMarkup(
          createElement('div', { className: 'box' }, text)
        ),
      })),
      css,
      width: 64,
      height: 32,
    });
    const text = (pdf: Buffer) => pdf.toString('latin1');
    /** `\b` keeps `/Pages` out of the count. */
    const pageCount = (pdf: Buffer) =>
      (text(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length;
    const stable = { metadata: { creationDate: '2026-01-01T00:00:00' } };
    /** Tiny PNG bytes, for `images`. */
    const PIXEL = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    it('writes one page per input at the shared size', async () => {
      const pdf = await createTakumiImageBackend().pdf(pages(['a', 'b', 'c']));

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(text(pdf)).toMatch(/\/Count 3\b/);
      expect(pageCount(pdf)).toBe(3);
      // Points are CSS px × 0.75.
      expect(text(pdf)).toMatch(
        /MediaBox\s*\[\s*0\s+0\s+48(?:\.0+)?\s+24(?:\.0+)?\s*\]/
      );
    });

    it('renders the same pages twice to identical bytes at a fixed creation date', async () => {
      const backend = createTakumiImageBackend();
      const first = await backend.pdf(pages(['a']), stable);
      const second = await backend.pdf(pages(['a']), stable);

      expect(first.equals(second)).toBe(true);
    });

    it('applies the shared stylesheet', async () => {
      const backend = createTakumiImageBackend();
      const red = await backend.pdf(pages(['a']), stable);
      const blue = await backend.pdf(
        pages(['a'], '.box { background: #0000ff; }'),
        stable
      );

      expect(red.equals(blue)).toBe(false);
    });

    it('rejects an empty page list', async () => {
      await expect(createTakumiImageBackend().pdf(pages([]))).rejects.toThrow(
        /at least one/
      );
    });

    it('exposes only the document options', () => {
      expectTypeOf<TakumiPdfOptions>().toEqualTypeOf<{
        metadata?: TakumiPdfMetadata;
        uncoveredText?: 'error' | 'placeholder' | 'blank';
        images?: TakumiPdfOptions['images'];
        outline?: boolean;
        lang?: string;
        backgroundColor?: string;
      }>();
    });

    it('rejects a glyph no registered font covers unless told otherwise', async () => {
      const backend = createTakumiImageBackend();

      await expect(backend.pdf(pages(['✓']))).rejects.toThrow(/U\+2713/);
      const blank = await backend.pdf(pages(['✓']), {
        uncoveredText: 'blank',
      });
      expect(blank.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('registers fonts on the pdf engine', async () => {
      const file =
        require.resolve('@fontsource/inter/files/inter-latin-700-normal.woff2');
      const css = '.box { font-family: Inter; font-weight: 700; }';
      const styled = await createTakumiImageBackend({
        fonts: [{ name: 'Inter', weight: 700, data: () => readFile(file) }],
      }).pdf(pages(['Ag'], css), stable);
      const fallback = await createTakumiImageBackend().pdf(
        pages(['Ag'], css),
        stable
      );

      expect(styled.equals(fallback)).toBe(false);
    });

    it('draws an image only from the bytes it is given', async () => {
      const src = 'https://example.invalid/logo.png';
      const withImage: PdfInput = {
        ...pages(['']),
        pages: [{ html: `<img src="${src}" width="16" height="16"/>` }],
      };
      const backend = createTakumiImageBackend();
      const blank = await backend.pdf(withImage, stable);
      const drawn = await backend.pdf(withImage, {
        ...stable,
        images: [{ src, data: PIXEL }],
      });

      expect(blank.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(drawn.equals(blank)).toBe(false);
    });

    it('reads a lazy font once per engine', async () => {
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
      await backend.pdf(pages(['a'], '.box { font-family: Inter; }'));
      await backend.pdf(pages(['a'], '.box { font-family: Inter; }'));

      expect(reads).toBe(2);
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
        backend.pdf(pages(['a'], '.box { font-family: Inter; }'))
      ).rejects.toThrow('transient');
      const pdf = await backend.pdf(
        pages(['a'], '.box { font-family: Inter; }')
      );

      expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(reads).toBe(2);
    });

    describe('pdfThread', () => {
      /** Event loop turns taken while `render` is pending, after a warm-up render. */
      const turnsDuring = async (
        backend: ReturnType<typeof createTakumiImageBackend>
      ) => {
        const deck = pages(Array.from({ length: 40 }, (_, i) => `page ${i}`));
        await backend.pdf(deck);
        let turns = 0;
        let done = false;
        const spin = () => {
          if (!done) {
            turns += 1;
            setImmediate(spin);
          }
        };
        setImmediate(spin);
        await backend.pdf(deck);
        done = true;
        await backend.close();
        return turns;
      };

      it('renders in a worker by default, leaving the event loop free', async () => {
        expect(await turnsDuring(createTakumiImageBackend())).toBeGreaterThan(
          0
        );
      });

      it('blocks the calling thread when inline', async () => {
        expect(
          await turnsDuring(createTakumiImageBackend({ pdfThread: 'inline' }))
        ).toBe(0);
      });

      it('writes the same bytes in a worker as inline', async () => {
        const file =
          require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2');
        const fonts = [
          { name: 'Inter', weight: 400, data: () => readFile(file) },
        ];
        const deck = pages(['Ag', 'b'], '.box { font-family: Inter; }');
        const worker = createTakumiImageBackend({ fonts });
        const inline = createTakumiImageBackend({ fonts, pdfThread: 'inline' });
        const [fromWorker, fromInline] = await Promise.all([
          worker.pdf(deck, stable),
          inline.pdf(deck, stable),
        ]);
        await Promise.all([worker.close(), inline.close()]);

        expect(fromWorker.equals(fromInline)).toBe(true);
      });

      it('reads lazy image bytes before posting them', async () => {
        const src = 'https://example.invalid/logo.png';
        const withImage: PdfInput = {
          ...pages(['']),
          pages: [{ html: `<img src="${src}" width="16" height="16"/>` }],
        };
        const backend = createTakumiImageBackend();
        const eager = await backend.pdf(withImage, {
          ...stable,
          images: [{ src, data: PIXEL }],
        });
        const lazy = await backend.pdf(withImage, {
          ...stable,
          images: { sources: [{ src, data: () => Promise.resolve(PIXEL) }] },
        });
        await backend.close();

        expect(lazy.equals(eager)).toBe(true);
      });

      it('restarts after a font the worker cannot register', async () => {
        let reads = 0;
        const file =
          require.resolve('@fontsource/inter/files/inter-latin-400-normal.woff2');
        const backend = createTakumiImageBackend({
          fonts: [
            {
              name: 'Inter',
              weight: 400,
              data: async () => {
                reads += 1;
                return reads === 1 ? Buffer.from('not a font') : readFile(file);
              },
            },
          ],
        });

        await expect(backend.pdf(pages(['a']))).rejects.toThrow();
        const pdf = await backend.pdf(pages(['a']));
        await backend.close();

        expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      });

      it('rejects a render in flight on close, and starts afresh after', async () => {
        const backend = createTakumiImageBackend();
        await backend.pdf(pages(['a']));
        const inFlight = expect(backend.pdf(pages(['a']))).rejects.toThrow(
          /closed/
        );
        await backend.close();

        await inFlight;
        const pdf = await backend.pdf(pages(['a']));
        await backend.close();
        expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      });
    });
  });

  describe('heightMode content', () => {
    /** A padded card of `rows` 24px rows: 20 + 24 × rows tall. */
    const card = (
      rows: number,
      heightMode?: ImageInput['heightMode']
    ): ImageInput => ({
      html: `<div class="card">${'<div class="row"></div>'.repeat(rows)}</div>`,
      css: '.card { padding: 10px; background: #eeeeee } .row { height: 24px; background: #cc0000 }',
      width: 120,
      // The estimate a content frame would give: wrong on purpose.
      height: 500,
      ...(heightMode === undefined ? {} : { heightMode }),
    });
    const contentHeight = (rows: number) => 20 + 24 * rows;

    it.each([
      ['a short body', 1],
      ['a tall body', 40],
    ])('sizes the png to %s', async (_label, rows) => {
      const backend = createTakumiImageBackend();
      const png = await backend.png(card(rows, 'content'));
      const doubled = await backend.png(card(rows, 'content'), { scale: 2 });

      expect(png.readUInt32BE(16)).toBe(120);
      expect(png.readUInt32BE(20)).toBe(contentHeight(rows));
      expect(doubled.readUInt32BE(16)).toBe(240);
      expect(doubled.readUInt32BE(20)).toBe(2 * contentHeight(rows));
      // The last row reaches the bottom padding, and nothing is drawn past it.
      const { height, pixel } = decodePng(png);
      expect(pixel(60, height - 11)).toEqual({ r: 0xcc, g: 0, b: 0 });
      expect(pixel(60, height - 1)).toEqual({ r: 0xee, g: 0xee, b: 0xee });
    });

    it('leaves a fixed input at its height', async () => {
      const backend = createTakumiImageBackend();
      const fixed = await backend.png(card(1, 'fixed'));
      const unstated = await backend.png(card(1));

      expect(fixed.readUInt32BE(20)).toBe(500);
      expect(unstated.equals(fixed)).toBe(true);
      await expect(backend.fit(card(1, 'fixed'))).resolves.toEqual(
        card(1, 'fixed')
      );
    });

    it('fits the height without drawing, matching the png', async () => {
      const backend = createTakumiImageBackend();
      const fitted = await backend.fit(card(3, 'content'));

      expect(fitted).toMatchObject({
        width: 120,
        height: contentHeight(3),
        heightMode: 'fixed',
      });
      const png = await backend.png(fitted);
      expect(png.equals(await backend.png(card(3, 'content')))).toBe(true);
    });

    it.each([
      ['0.5', { devicePixelRatio: 0.5 }],
      ['2', { devicePixelRatio: 2 }],
      ['2 at scale 2', { devicePixelRatio: 2, scale: 2 }],
    ])(
      'fits to the same png as a content-sized render at devicePixelRatio %s',
      async (_label, options) => {
        const backend = createTakumiImageBackend();
        const direct = await backend.png(card(3, 'content'), options);
        const fitted = await backend.png(
          await backend.fit(card(3, 'content'), options),
          options
        );

        expect(fitted.readUInt32BE(20)).toBe(direct.readUInt32BE(20));
        expect(fitted.equals(direct)).toBe(true);
      }
    );

    it('sizes the svg and the measured root to content', async () => {
      const backend = createTakumiImageBackend();
      const svg = await backend.svg(card(2, 'content'));
      const box = await backend.measure(card(2, 'content'));

      expect(svg).toContain(`height="${contentHeight(2)}"`);
      expect(box).toMatchObject({ width: 120, height: contentHeight(2) });
    });

    it('sizes every pdf page to the tallest page', async () => {
      const backend = createTakumiImageBackend();
      const deck: PdfInput = {
        pages: [{ html: card(1).html }, { html: card(4).html }],
        css: card(1).css,
        width: 120,
        height: 500,
        heightMode: 'content',
      };
      const fitted = await backend.fitPages(deck);
      const pdf = (await backend.pdf(deck)).toString('latin1');

      expect(fitted).toMatchObject({
        height: contentHeight(4),
        heightMode: 'fixed',
      });
      // Points are CSS px × 0.75.
      const boxes = [...pdf.matchAll(/MediaBox\s*\[([^\]]*)\]/g)].map(
        ([, box = '']) => box.trim().split(/\s+/).map(Number)
      );
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) {
        expect(box).toEqual([0, 0, 90, contentHeight(4) * 0.75]);
      }
    });

    it('measures pdf pages inside the page block they are drawn in', async () => {
      const backend = createTakumiImageBackend();
      // Matches a card only once it sits inside the page block.
      const css = `${card(1).css} div > .card { padding-top: 100px }`;
      const fitted = await backend.fitPages({
        pages: [{ html: card(2).html }],
        css,
        width: 120,
        height: 500,
        heightMode: 'content',
      });

      // The 100px top padding replaces the card's 10px.
      expect(fitted.height).toBe(contentHeight(2) + 90);
    });
  });
});
