/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { type FontLoader, Renderer, type RenderOptions } from '@takumi-rs/core';
import { fromHtml } from '@takumi-rs/helpers/html';

/**
 * What the `svg` surface returns: a React tree and the stylesheet it is laid
 * out against, plus the viewport it was measured for.
 *
 * Declared structurally rather than imported from `@elastic/isomer-runtime`,
 * so this backend depends on no isomer package. `SvgRenderResult` satisfies it.
 */
export interface ImageInput {
  /** A single root, as image layout requires: one element, string, or number, never an array or fragment. */
  element: ReactNode;
  css: string;
  width: number;
  height: number;
}

/** Options for {@link createTakumiImageBackend}. */
export interface TakumiImageBackendOptions {
  /**
   * Fonts to register, in fallback order. A pack names families in its theme
   * and this backend holds no opinion about which; nothing is registered by
   * default, so an unregistered family falls back to takumi's built-in face.
   *
   * WOFF and WOFF2 are accepted as well as raw sfnt — `@takumi-rs/core` builds
   * with takumi's `woff`/`woff2` features, so a `@fontsource/*` file can be
   * passed as-is, as raw bytes or a lazy `data()`. A `FontLoader` string is a
   * URL fetched on demand, not a filesystem path.
   */
  fonts?: readonly FontLoader[];
  /** Byte budget for takumi's resource cache. `0` disables it. */
  cacheMaxBytes?: number;
}

/** Per-render overrides. Geometry comes from the input, not from here. */
export interface TakumiRenderOptions {
  /**
   * Raises rendering fidelity (sharper text and gradients) at a fixed output
   * size — the PNG stays sized to `input.width` / `input.height` regardless
   * of this value; it does not produce a larger raster.
   */
  devicePixelRatio?: number;
}

/**
 * Rasterizes the `svg` surface's output.
 *
 * Both methods are one call over takumi: the tree is serialized, `fromHtml`
 * turns it into a takumi node tree and lifts the stylesheet out, and takumi
 * lays the result out at the input's viewport.
 */
export interface TakumiImageBackend {
  /** Renders to an encoded PNG. */
  png(input: ImageInput, options?: TakumiRenderOptions): Promise<Buffer>;
  /** Renders to an SVG document. Vector output, so raster options do not apply. */
  svg(input: ImageInput): Promise<string>;
}

const escapeStyleEndTags = (css: string) =>
  css.replace(/<\/style/gi, (tag) => tag.replace('/', '\\/'));

/**
 * Serializes the tree with its stylesheet inlined, the form `fromHtml` lifts
 * into its own `css` list. Passing the stylesheet as a separate `CssInput`
 * entry is a different path through takumi and changes the committed PNG bytes.
 */
const toTakumiSource = ({ element, css }: ImageInput) =>
  fromHtml(
    `<style>${escapeStyleEndTags(css)}</style>${renderToStaticMarkup(element)}`
  );

export const createTakumiImageBackend = ({
  fonts = [],
  cacheMaxBytes,
}: TakumiImageBackendOptions = {}): TakumiImageBackend => {
  const renderer = new Renderer(
    cacheMaxBytes === undefined ? undefined : { cacheMaxBytes }
  );

  /**
   * Registration is async and every render needs it, so it runs once and is
   * awaited rather than repeated. Sequential because the registration order is
   * the default fallback order. A failed attempt is forgotten so the next
   * render retries instead of inheriting the rejection.
   */
  let registered: Promise<void> | undefined;
  const ready = () => {
    registered ??= (async () => {
      for (const font of fonts) {
        await renderer.registerFont(font);
      }
    })().catch((error: unknown) => {
      registered = undefined;
      throw error;
    });
    return registered;
  };

  return {
    png: async (input, options = {}) => {
      await ready();
      const { node, css } = toTakumiSource(input);
      const renderOptions: RenderOptions = {
        width: input.width,
        height: input.height,
        format: 'png',
        css,
      };
      if (options.devicePixelRatio !== undefined) {
        renderOptions.devicePixelRatio = options.devicePixelRatio;
      }
      return renderer.render(node, renderOptions);
    },
    svg: async (input) => {
      await ready();
      const { node, css } = toTakumiSource(input);
      return renderer.renderSvg(node, {
        width: input.width,
        height: input.height,
        css,
      });
    },
  };
};
