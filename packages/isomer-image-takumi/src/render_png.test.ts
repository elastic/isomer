/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import type { SvgRenderOptions } from '@elastic/isomer-runtime';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createTakumiImageBackend } from './backend';
import type {
  PngRuntime,
  PngSvgOptions,
  PngValidationResult,
} from './render_png';
import { renderPng } from './render_png';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/** Stands in for `IsomerRuntime`: validates by a simple rule, renders a fixed box. */
const runtimeReturning = (validation: PngValidationResult): PngRuntime => ({
  validate: () => validation,
  surfaces: {
    svg: {
      render: (_composition, options) => {
        expect(options).toMatchObject({ onValidationError: 'collect' });
        return {
          element: createElement('div', { className: 'box' }, 'Ag'),
          css: '.box { background: #ff0000; }',
          width: 64,
          height: 32,
        };
      },
    },
  },
});

describe('renderPng', () => {
  it('accepts the runtime svg surface options without importing them', () => {
    expectTypeOf<SvgRenderOptions>().toExtend<PngSvgOptions>();
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

  it('forwards svg and raster options to the render and the backend', async () => {
    let seenSvgOptions: unknown;
    const runtime: PngRuntime = {
      validate: () => ({ valid: true, errors: [] }),
      surfaces: {
        svg: {
          render: (_composition, options) => {
            seenSvgOptions = options;
            return {
              element: createElement('div', { className: 'box' }, 'Ag'),
              css: '.box { background: #ff0000; }',
              width: 64,
              height: 32,
            };
          },
        },
      },
    };

    await renderPng(runtime, { type: 'view' }, createTakumiImageBackend(), {
      svg: { frame: 'card' },
      devicePixelRatio: 2,
    });

    expect(seenSvgOptions).toMatchObject({
      frame: 'card',
      onValidationError: 'collect',
    });
  });
});
