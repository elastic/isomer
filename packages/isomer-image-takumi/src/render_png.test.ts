/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotRenderOptions } from '@elastic/isomer-runtime';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createTakumiImageBackend, type TakumiImageBackend } from './backend';
import type {
  PngRuntime,
  PngValidationResult,
  SnapshotOptions,
} from './render_png';
import { renderPng } from './render_png';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/** Stands in for `IsomerRuntime`: validates by a simple rule, renders a fixed box. */
const runtimeReturning = (validation: PngValidationResult): PngRuntime => ({
  validate: (composition) => ({ ...validation, composition }),
  surfaces: {
    snapshot: {
      render: (_composition, options) => {
        expect(options).toMatchObject({ onValidationError: 'collect' });
        return {
          html: '<div class="box">Ag</div>',
          css: '.box { background: #ff0000; }',
          width: 64,
          height: 32,
        };
      },
    },
  },
});

describe('renderPng', () => {
  it('accepts the runtime snapshot surface options without importing them', () => {
    expectTypeOf<SnapshotRenderOptions>().toExtend<SnapshotOptions>();
  });

  it('takes a custom backend with only png and svg', async () => {
    const takumi = createTakumiImageBackend();
    const backend: TakumiImageBackend = {
      png: (input, options) => takumi.png(input, options),
      svg: (input) => takumi.svg(input),
    };
    const result = await renderPng(
      runtimeReturning({ valid: true, errors: [] }),
      { type: 'view' },
      backend
    );
    expect(result.png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });

  it('renders even an invalid composition and reports why', async () => {
    const runtime = runtimeReturning({
      valid: false,
      errors: [{ path: 'body[0]', message: 'is required' }],
    });

    const result = await renderPng(
      runtime,
      { type: 'view' },
      createTakumiImageBackend()
    );

    expect(result.png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(result.width).toBe(64);
    expect(result.height).toBe(32);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errors).toHaveLength(1);
  });

  it('reports a valid composition without throwing', async () => {
    const runtime = runtimeReturning({ valid: true, errors: [] });

    const result = await renderPng(
      runtime,
      { type: 'view' },
      createTakumiImageBackend()
    );

    expect(result.validation).toEqual({ valid: true, errors: [] });
  });

  it('draws the copy validation checked and reports the result without it', async () => {
    const drawn: unknown[] = [];
    const checked = { type: 'view', title: 'checked' };
    const runtime: PngRuntime = {
      validate: () => ({ valid: true, errors: [], composition: checked }),
      surfaces: {
        snapshot: {
          render: (composition) => {
            drawn.push(composition);
            return {
              html: '<div>Ag</div>',
              css: '',
              width: 64,
              height: 32,
            };
          },
        },
      },
    };

    const result = await renderPng(
      runtime,
      { type: 'view', title: 'input' },
      createTakumiImageBackend()
    );

    expect(drawn).toEqual([checked]);
    expect(result.validation).toEqual({ valid: true, errors: [] });
  });

  it('throws rather than draw the input when the runtime returns no copy', async () => {
    const drawn: unknown[] = [];
    const runtimeWith = (validation: PngValidationResult): PngRuntime => ({
      validate: () => ({ ...validation, composition: undefined }),
      surfaces: {
        snapshot: {
          render: (composition) => {
            drawn.push(composition);
            return { html: '', css: '', width: 1, height: 1 };
          },
        },
      },
    });
    const errors = [{ path: '', message: 'input nests deeper than 64 levels' }];

    await expect(
      renderPng(
        runtimeWith({ valid: false, errors }),
        { type: 'view' },
        createTakumiImageBackend()
      )
    ).rejects.toMatchObject({
      name: 'CompositionValidationError',
      code: 'COMPOSITION_INVALID',
      errors,
    });
    await expect(
      renderPng(
        runtimeWith({ valid: true, errors: [] }),
        { type: 'view' },
        createTakumiImageBackend()
      )
    ).rejects.toThrow(
      'renderPng: runtime.validate returned no checked composition'
    );
    expect(drawn).toEqual([]);
  });

  it('forwards snapshot and raster options to the render and the backend', async () => {
    let seenSnapshotOptions: unknown;
    const runtime: PngRuntime = {
      validate: (composition) => ({ valid: true, errors: [], composition }),
      surfaces: {
        snapshot: {
          render: (_composition, options) => {
            seenSnapshotOptions = options;
            return {
              html: '<div class="box">Ag</div>',
              css: '.box { background: #ff0000; }',
              width: 64,
              height: 32,
            };
          },
        },
      },
    };

    await renderPng(runtime, { type: 'view' }, createTakumiImageBackend(), {
      snapshot: { frame: 'card' },
      devicePixelRatio: 2,
    });

    expect(seenSnapshotOptions).toMatchObject({
      frame: 'card',
      onValidationError: 'collect',
    });
  });
});
