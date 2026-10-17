/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioConfig } from '../config';
import type { JsxTransform, RasterizePng, RenderPdf } from '../types';

import type { StudioHost } from './mount';
import { assetUrl } from './mount';

const transformJsx: JsxTransform = async (source) => {
  const response = await fetch(assetUrl('transform'), {
    method: 'POST',
    body: source,
  });
  const code = await response.text();
  if (!response.ok) {
    throw new Error(code);
  }
  return code;
};

const rasterizePng: RasterizePng = async (composition, { signal }) => {
  const response = await fetch(assetUrl('png'), {
    method: 'POST',
    body: JSON.stringify(composition),
    signal,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.blob();
};

const renderPdf: RenderPdf = async (compositions, { title, signal } = {}) => {
  const response = await fetch(assetUrl('pdf'), {
    method: 'POST',
    body: JSON.stringify({ title, compositions }),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.blob();
};

/** `isomer-studio dev`: the server compiles JSX, rasterizes PNGs and writes PDFs. */
export const devHost = ({ runtime }: StudioConfig): StudioHost => ({
  transformJsx,
  ...(runtime.surfaces.snapshot ? { rasterizePng, renderPdf } : {}),
});
