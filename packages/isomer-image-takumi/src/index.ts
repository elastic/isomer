/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type ImageInput,
  type LayoutBox,
  type PdfInput,
  type TakumiImageBackend,
  type TakumiImageBackendOptions,
  type TakumiMeasuringBackend,
  type TakumiPdfBackend,
  type TakumiPdfMetadata,
  type TakumiPdfOptions,
  type TakumiRenderOptions,
  createTakumiImageBackend,
} from './backend';
export {
  type PdfRuntime,
  type RenderPdfOptions,
  type RenderPdfResult,
  renderPdf,
} from './render_pdf';
export {
  type PngRuntime,
  type PngSvgOptions,
  type PngValidationResult,
  type RenderPngOptions,
  type RenderPngResult,
  renderPng,
} from './render_png';
export type { Font, FontDetails, FontLoader } from '@takumi-rs/core';
export type { ImagesInput } from 'takumi-pdf';
