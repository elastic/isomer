/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PdfInput, TakumiPdfBackend, TakumiPdfOptions } from './backend';
import type { PngSvgOptions, PngValidationResult } from './render_png';

/**
 * The slice of `IsomerRuntime` this helper needs, declared structurally like
 * {@link PdfInput}. A runtime built with `frames` satisfies it.
 */
export interface PdfRuntime {
  validate(composition: unknown): PngValidationResult;
  surfaces: {
    svg: {
      renderPages(
        compositions: readonly unknown[],
        options?: PngSvgOptions & { onValidationError?: 'collect' | 'throw' }
      ): PdfInput;
    };
  };
}

/** Options for {@link renderPdf}. */
export interface RenderPdfOptions extends TakumiPdfOptions {
  /** Forwarded to `runtime.surfaces.svg.renderPages`, so every page shares one frame. */
  svg?: PngSvgOptions;
}

export interface RenderPdfResult {
  pdf: Buffer;
  pageCount: number;
  width: number;
  height: number;
  /** One per composition, in order. */
  validations: PngValidationResult[];
}

/**
 * Validates, renders, and writes a deck as one PDF in one call, a page per
 * composition.
 *
 * Every composition is rendered, even an invalid one: `validations` is how a
 * caller finds out, rather than a thrown error. Validation runs twice, once
 * here and once inside `renderPages`, which discards its own result. An
 * empty deck throws the runtime's `EMPTY_PAGES`.
 */
export const renderPdf = async (
  runtime: PdfRuntime,
  deck: readonly unknown[],
  backend: TakumiPdfBackend,
  { svg, ...options }: RenderPdfOptions = {}
): Promise<RenderPdfResult> => {
  const validations = deck.map((composition) => runtime.validate(composition));
  const rendered = runtime.surfaces.svg.renderPages(deck, {
    ...svg,
    onValidationError: 'collect',
  });
  const pdf = await backend.pdf(rendered, options);
  return {
    pdf,
    pageCount: rendered.pages.length,
    width: rendered.width,
    height: rendered.height,
    validations,
  };
};
