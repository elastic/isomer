/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import type { Composition } from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';
import { PNG_SCALE } from '../types';

import { createRasterizer, createRenderers, imageFontsOf } from './rasterize';

const png = vi.fn(() => Promise.resolve(Buffer.from('png')));
const createTakumiImageBackend = vi.fn((_options: unknown) => ({ png }));
const renderPdf = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ pdf: Buffer.from('pdf') })
);

vi.mock('@elastic/isomer-image-takumi', () => ({
  createTakumiImageBackend: (options: unknown) =>
    createTakumiImageBackend(options),
  renderPdf: (...args: unknown[]) => renderPdf(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createRasterizer', () => {
  it('rasterizes the snapshot at the geometry the frame estimates', async () => {
    const snapshot = { html: '<div/>', css: '', width: 960, height: 540 };
    const render = vi.fn(() => snapshot);
    const runtime = {
      surfaces: { snapshot: { render } },
    } as unknown as StudioRuntime;
    const composition: Composition = { type: 'view', body: [] };

    const rasterize = createRasterizer(runtime);
    await rasterize?.(composition);

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(composition, {
      onValidationError: 'collect',
    });
    expect(png).toHaveBeenCalledWith(snapshot, { scale: PNG_SCALE });
  });

  it('is undefined without a snapshot surface', () => {
    expect(
      createRasterizer({ surfaces: {} } as unknown as StudioRuntime)
    ).toBeUndefined();
  });
});

describe('createRenderers', () => {
  const snapshot = { render: vi.fn(), renderPages: vi.fn() };
  const validate = vi.fn();
  const runtime = {
    validate,
    surfaces: { snapshot },
  } as unknown as StudioRuntime;
  const slides: Composition[] = [
    { type: 'view', body: [] },
    { type: 'view', body: [] },
  ];

  it('writes one PDF of every composition, titled', async () => {
    const pdf = await createRenderers(runtime)?.pdf(slides, { title: 'Deck' });

    expect(pdf?.toString()).toBe('pdf');
    const [[drawable, ...rest]] = renderPdf.mock.calls as unknown as [
      [
        {
          validate: (composition: Composition) => unknown;
          surfaces: unknown;
        },
        ...unknown[],
      ],
    ];
    expect(rest).toEqual([slides, { png }, { metadata: { title: 'Deck' } }]);
    expect(drawable.surfaces).toEqual({ snapshot });
    drawable.validate(slides[0]!);
    expect(validate).toHaveBeenCalledWith(slides[0]);
  });

  it('loads the fonts once, into the one backend PNGs and PDFs share', async () => {
    const font = {
      name: 'Inter',
      data: () => Promise.resolve(Buffer.from('')),
    };
    const fonts = vi.fn(() => Promise.resolve([font]));
    const renderers = createRenderers(runtime, fonts);

    await renderers?.pdf(slides);
    await renderers?.png(slides[0]!);

    expect(fonts).toHaveBeenCalledTimes(1);
    expect(createTakumiImageBackend).toHaveBeenCalledTimes(1);
    expect(createTakumiImageBackend).toHaveBeenCalledWith({ fonts: [font] });
  });
});

describe('imageFontsOf', () => {
  const font = { name: 'Inter', data: () => Promise.resolve(Buffer.from('')) };

  it('is undefined without `imageFonts`', () => {
    expect(imageFontsOf({}, '/deck/isomer-studio.config.ts', vi.fn())).toBe(
      undefined
    );
  });

  it('imports the module beside the config once, unwrapping a CommonJS default', async () => {
    const importModule = vi.fn(() =>
      Promise.resolve({ default: { default: [font] } })
    );
    const fonts = imageFontsOf(
      { imageFonts: './studio/fonts.ts' },
      '/deck/isomer-studio.config.ts',
      importModule
    );

    expect(await fonts?.()).toEqual([font]);
    expect(await fonts?.()).toEqual([font]);
    expect(importModule).toHaveBeenCalledTimes(1);
    expect(importModule).toHaveBeenCalledWith('/deck/studio/fonts.ts');
  });

  it('imports again after a failed import', async () => {
    const importModule = vi
      .fn<(path: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('syntax error'))
      .mockResolvedValueOnce({ default: [font] });
    const fonts = imageFontsOf(
      { imageFonts: './fonts.ts' },
      '/deck/isomer-studio.config.ts',
      importModule
    );

    await expect(fonts?.()).rejects.toThrow('syntax error');
    expect(await fonts?.()).toEqual([font]);
  });

  it('names the module when its default export is not a list', async () => {
    const fonts = imageFontsOf(
      { imageFonts: './fonts.ts' },
      '/deck/isomer-studio.config.ts',
      () => Promise.resolve({ default: font })
    );

    await expect(fonts?.()).rejects.toThrow(
      './fonts.ts must default-export an array of takumi font loaders.'
    );
  });
});
