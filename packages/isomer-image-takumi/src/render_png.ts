/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImageInput,
  TakumiImageBackend,
  TakumiRenderOptions,
} from './backend';

/** A validation result shaped like the SDK's `ValidationResult`, declared structurally. */
export interface PngValidationResult {
  valid: boolean;
  errors: readonly unknown[];
}

/**
 * The `svg` surface's per-render options, mirroring the runtime's
 * `SvgRenderOptions` so a caller gets completion without importing it.
 */
export interface PngSvgOptions {
  /** Which of the runtime's frames this render uses; defaults to its `defaultFrame`. */
  frame?: string;
  /** Overrides the frame's `defaultWidth`. */
  width?: number;
  /** Overrides the frame's estimated height. */
  height?: number;
  /** Theme mode; falls back to the composition's own `theme`. */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * The slice of `IsomerRuntime` this helper needs, declared structurally like
 * {@link ImageInput} so this package depends on no isomer package. `surfaces.svg`
 * is required where the runtime's generic form has `SvgSurface | undefined`; a
 * runtime built with `frames` carries `SvgSurface` there and satisfies this.
 */
export interface PngRuntime {
  validate(composition: unknown): PngValidationResult;
  surfaces: {
    svg: {
      render(
        composition: unknown,
        options?: PngSvgOptions & { onValidationError?: 'collect' | 'throw' }
      ): ImageInput;
    };
  };
}

/** Options for {@link renderPng}. */
export interface RenderPngOptions extends TakumiRenderOptions {
  /** Forwarded to `runtime.surfaces.svg.render`. */
  svg?: PngSvgOptions;
}

export interface RenderPngResult {
  png: Buffer;
  width: number;
  height: number;
  validation: PngValidationResult;
}

/**
 * Validates, renders, and rasterizes a composition in one call.
 *
 * The composition is always rendered, even when invalid: `validation` is how
 * a caller finds out, rather than a thrown error. Validation runs twice, once
 * here and once inside `render`, which discards its own result.
 */
export const renderPng = async (
  runtime: PngRuntime,
  composition: unknown,
  backend: TakumiImageBackend,
  { svg, ...options }: RenderPngOptions = {}
): Promise<RenderPngResult> => {
  const validation = runtime.validate(composition);
  const rendered = runtime.surfaces.svg.render(composition, {
    ...svg,
    onValidationError: 'collect',
  });
  const png = await backend.png(rendered, options);
  return { png, width: rendered.width, height: rendered.height, validation };
};
