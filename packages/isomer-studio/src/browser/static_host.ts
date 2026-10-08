/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioConfig } from '../config';
import { compositionKey } from '../model/composition_key';
import {
  describeTransformError,
  JSX_TRANSFORM_OPTIONS,
} from '../model/jsx_transform';
import type { PngManifest } from '../model/png_manifest';
import { isPngManifest, PngUnavailableError } from '../model/png_manifest';
import type { JsxTransform, RasterizePng } from '../types';

import type { StudioHost } from './mount';
import { assetUrl } from './mount';

type Esbuild = typeof import('esbuild-wasm/esm/browser.js');

let esbuild: Promise<Esbuild> | undefined;

/** `esbuild-wasm`, fetched and started the first time the editor compiles JSX. */
const loadEsbuild = (): Promise<Esbuild> =>
  (esbuild ??= import('esbuild-wasm/esm/browser.js').then(async (module) => {
    await module.initialize({ wasmURL: assetUrl('assets/esbuild.wasm') });
    return module;
  }));

const transformJsx: JsxTransform = async (source) => {
  const { transform } = await loadEsbuild();
  try {
    const { code } = await transform(source, JSX_TRANSFORM_OPTIONS);
    return code;
  } catch (error) {
    throw new Error(describeTransformError(error));
  }
};

const EMPTY_MANIFEST: PngManifest = { version: 1, entries: {} };

/** Looks each composition up in `png/manifest.json`, which `isomer-studio build` prerendered. */
const manifestRasterizer = (): RasterizePng => {
  let manifest: Promise<PngManifest> | undefined;
  const loadManifest = () =>
    (manifest ??= fetch(assetUrl('png/manifest.json'))
      .then(async (response) => {
        const body: unknown = response.ok ? await response.json() : undefined;
        return isPngManifest(body) ? body : EMPTY_MANIFEST;
      })
      .catch(() => EMPTY_MANIFEST));

  return async (composition, { signal }) => {
    const [{ entries }, key] = await Promise.all([
      loadManifest(),
      compositionKey(composition),
    ]);
    const entry = entries[key];
    if (!entry) {
      throw new PngUnavailableError();
    }
    const response = await fetch(assetUrl(`png/${entry.file}`), { signal });
    if (!response.ok) {
      throw new Error(`png/${entry.file} answered ${response.status}.`);
    }
    return response.blob();
  };
};

/** `isomer-studio build`: JSX compiles in the browser, and PNGs come from the build's manifest. */
export const staticHost = ({ runtime }: StudioConfig): StudioHost => ({
  transformJsx,
  rasterizePng: runtime.surfaces.snapshot ? manifestRasterizer() : undefined,
});
