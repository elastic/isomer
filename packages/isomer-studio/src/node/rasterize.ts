/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dirname, resolve } from 'node:path';

import type { FontLoader, TakumiBackend } from '@elastic/isomer-image-takumi';
import type { Composition } from '@elastic/isomer-sdk';

import type { StudioConfig, StudioRuntime } from '../config';
import { PNG_SCALE } from '../types';

export type NodeRasterizer = (composition: Composition) => Promise<Buffer>;

export type NodePdfWriter = (
  compositions: readonly Composition[],
  options?: { title?: string | undefined }
) => Promise<Buffer>;

export interface NodeRenderers {
  png: NodeRasterizer;
  pdf: NodePdfWriter;
}

/** Resolves the faces takumi draws text with. */
export type ImageFonts = () => Promise<readonly FontLoader[]>;

const fontsIn = (namespace: unknown): unknown => {
  const exported =
    typeof namespace === 'object' &&
    namespace !== null &&
    'default' in namespace
      ? namespace.default
      : undefined;
  return Array.isArray(exported) ||
    typeof exported !== 'object' ||
    exported === null ||
    !('default' in exported)
    ? exported
    : exported.default;
};

/** The config's `imageFonts` module, imported once on first use with `importModule`; `undefined` without one. */
export const imageFontsOf = (
  { imageFonts }: Pick<StudioConfig, 'imageFonts'>,
  configPath: string,
  importModule: (path: string) => Promise<unknown>
): ImageFonts | undefined => {
  if (imageFonts === undefined) {
    return undefined;
  }
  const path = resolve(dirname(configPath), imageFonts);
  let fonts: Promise<readonly FontLoader[]> | undefined;
  return () =>
    (fonts ??= importModule(path).then((namespace) => {
      const exported = fontsIn(namespace);
      if (!Array.isArray(exported)) {
        throw new Error(
          `${imageFonts} must default-export an array of takumi font loaders.`
        );
      }
      return exported as readonly FontLoader[];
    }));
};

/**
 * Draws with takumi, loaded on first use because it is native; `undefined` without a snapshot surface.
 * Images take the frame's own geometry, as the Snapshot preview does. Without `fonts`, a PNG falls back to takumi's built-in face and a PDF can't draw text.
 */
export const createRenderers = (
  runtime: StudioRuntime,
  fonts?: ImageFonts
): NodeRenderers | undefined => {
  const { snapshot } = runtime.surfaces;
  if (!snapshot) {
    return undefined;
  }
  let backend: Promise<TakumiBackend> | undefined;
  const loadBackend = () =>
    (backend ??= Promise.all([
      import('@elastic/isomer-image-takumi'),
      fonts?.() ?? [],
    ]).then(([{ createTakumiImageBackend }, faces]) =>
      createTakumiImageBackend({ fonts: faces })
    ));

  return {
    png: async (composition) =>
      (await loadBackend()).png(
        snapshot.render(composition, { onValidationError: 'collect' }),
        { scale: PNG_SCALE }
      ),
    pdf: async (compositions, { title } = {}) => {
      const takumi = await loadBackend();
      const { renderPdf } = await import('@elastic/isomer-image-takumi');
      const drawable = {
        validate: (composition: Composition) => runtime.validate(composition),
        surfaces: { snapshot },
      };
      const { pdf } = await renderPdf(drawable, compositions, takumi, {
        ...(title === undefined ? {} : { metadata: { title } }),
      });
      return pdf;
    },
  };
};

/** {@link createRenderers}' PNGs alone. */
export const createRasterizer = (
  runtime: StudioRuntime,
  fonts?: ImageFonts
): NodeRasterizer | undefined => createRenderers(runtime, fonts)?.png;
