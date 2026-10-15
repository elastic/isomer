/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { StudioConfig } from './config';

/**
 * Compiles JSX source to JavaScript using the classic runtime: elements become `h(...)` calls and
 * fragments `Fragment`.
 */
export type JsxTransform = (source: string) => Promise<string>;

/** Raster pixels per CSS pixel in a {@link RasterizePng} image. */
export const PNG_SCALE = 2;

/**
 * Rasterizes a composition to PNG on the host, which can run `@elastic/isomer-image-takumi` where the browser can't.
 * The image is drawn at {@link PNG_SCALE}, and the preview shows it at its size in CSS pixels.
 */
export type RasterizePng = (
  composition: Composition,
  options: { signal: AbortSignal }
) => Promise<Blob>;

/** Writes compositions as one PDF on the host, a page each, drawn like {@link RasterizePng}'s images. */
export type RenderPdf = (
  compositions: readonly Composition[],
  options?: { title?: string | undefined; signal?: AbortSignal | undefined }
) => Promise<Blob>;

export interface IsomerStudioProps extends StudioConfig {
  /** Compiles edited JSX; without it the editor offers JSON only. */
  transformJsx?: JsxTransform | undefined;
  /** Adds a PNG preview beneath the `snapshot` surface; without it there is none. */
  rasterizePng?: RasterizePng | undefined;
  /** Lets apps download PDFs; without it they can't. */
  renderPdf?: RenderPdf | undefined;
  /** Why the config's latest apps were rejected, shown above the page. */
  configProblems?: readonly string[] | undefined;
}
