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
import {
  checkedForDrawing,
  type CheckedValidationResult,
  type ValidationResult,
} from './validation';

/**
 * The `snapshot` surface's per-render options, mirroring the runtime's
 * `SnapshotRenderOptions` so a caller gets completion without importing it.
 */
export interface SnapshotOptions {
  /** Which of the runtime's frames this render uses; defaults to its `defaultFrame`. */
  frame?: string;
  /** Overrides the frame's `defaultWidth`. */
  width?: number;
  /** Overrides the frame's estimated height, and its content sizing. */
  height?: number;
  /** Theme mode; falls back to the composition's own `theme`. `auto` resolves light. */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * The slice of `IsomerRuntime` this helper needs, declared structurally like
 * {@link ImageInput} so this package depends on no isomer package. `surfaces.snapshot`
 * is required where the runtime's generic form has `SnapshotSurface | undefined`; a
 * runtime built with `frames` carries `SnapshotSurface` there and satisfies this.
 */
export interface PngRuntime {
  validate(composition: unknown): CheckedValidationResult;
  surfaces: {
    snapshot: {
      render(
        composition: unknown,
        options?: SnapshotOptions & { onValidationError?: 'collect' | 'throw' }
      ): ImageInput;
    };
  };
}

/** Options for {@link renderPng}. */
export interface RenderPngOptions extends TakumiRenderOptions {
  /** Forwarded to `runtime.surfaces.snapshot.render`. */
  snapshot?: SnapshotOptions;
}

/** What {@link renderPng} resolves to: the bytes, their size, and the findings on the composition drawn. */
export interface RenderPngResult {
  png: Buffer;
  /**
   * The viewport, in CSS pixels; the raster is this times `scale`, rounded.
   * Under a frame that sizes to content, `height` is the laid-out height
   * when the backend has `fit`, and the frame's estimate when it has not.
   */
  width: number;
  height: number;
  validation: ValidationResult;
}

/**
 * Validates, renders, and rasterizes a composition in one call.
 *
 * The composition is rendered even when invalid: `validation` is how a caller
 * finds out, rather than a thrown error. What is drawn is the copy validation
 * checked, and input refused before parsing, which has none, throws
 * `CompositionValidationError`. Validation runs twice, once here and once inside `render`, which
 * discards its own result. Under a frame that sizes to content, the backend's
 * `fit` measures first and the PNG is drawn at the height it reports.
 */
export const renderPng = async (
  runtime: PngRuntime,
  composition: unknown,
  backend: TakumiImageBackend,
  { snapshot, ...options }: RenderPngOptions = {}
): Promise<RenderPngResult> => {
  const { checked, validation } = checkedForDrawing(
    'renderPng',
    runtime.validate(composition)
  );
  const estimated = runtime.surfaces.snapshot.render(checked, {
    ...snapshot,
    onValidationError: 'collect',
  });
  const rendered = backend.fit
    ? await backend.fit(estimated, options)
    : estimated;
  const png = await backend.png(rendered, options);
  return { png, width: rendered.width, height: rendered.height, validation };
};
