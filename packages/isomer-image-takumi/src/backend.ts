/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type FontLoader,
  type MeasuredNode,
  Renderer,
  type RenderOptions,
} from '@takumi-rs/core';
import { fromHtml } from '@takumi-rs/helpers/html';
import type {
  ImagesInput,
  RenderOptions as PdfRenderOptions,
} from 'takumi-pdf';

/**
 * The part of a `snapshot` surface result this backend reads: the markup, the
 * stylesheet it is laid out against, and the viewport it was measured for.
 *
 * Declared structurally rather than imported from `@elastic/isomer-runtime`,
 * so this backend depends on no isomer package. `SnapshotRenderResult` satisfies it.
 */
export interface ImageInput {
  /** Static markup with a single root, as image layout requires. */
  html: string;
  /** The stylesheet the markup is laid out against, `light-dark(…)` already resolved. */
  css: string;
  /** The viewport, in CSS pixels; the output is this size. */
  width: number;
  height: number;
}

/**
 * The part of a `snapshot` surface's `renderPages` result this backend reads:
 * one page's markup each, all laid out against one stylesheet at one size.
 * Structural like {@link ImageInput}; `SnapshotPagesResult` satisfies it.
 */
export interface PdfInput {
  /** One page per entry, in order, each static markup with a single root. */
  pages: readonly { html: string }[];
  /** One stylesheet collected across every page. */
  css: string;
  /** Every page's size, in CSS pixels. */
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

/** Document properties written into a PDF. */
export interface TakumiPdfMetadata {
  title?: string;
  description?: string;
  authors?: string[];
  keywords?: string[];
  creator?: string;
  /** UTC, `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`. Fixing it makes the bytes stable across renders. */
  creationDate?: string;
}

/** Per-document options for {@link TakumiPdfBackend.pdf}. Geometry comes from the input. */
export interface TakumiPdfOptions {
  metadata?: TakumiPdfMetadata;
  /**
   * What a glyph no registered font covers becomes. The default, `'error'`,
   * rejects the render naming the code point, where `png` draws takumi's
   * built-in face instead; `'placeholder'` draws the font's glyph 0 and
   * `'blank'` draws nothing.
   */
  uncoveredText?: 'error' | 'placeholder' | 'blank';
  /**
   * Bytes for the `img` sources in the tree. The PDF engine fetches nothing,
   * so a remote `src` with no entry here draws blank; a `data:` URI needs none.
   */
  images?: ImagesInput;
  /** Writes a document outline from the headings. */
  outline?: boolean;
  /** BCP 47 tag for the document's language. */
  lang?: string;
  /** Paper color painted under every page; unset leaves the page empty. */
  backgroundColor?: string;
}

/** A laid-out element on the canvas, in pixels, with the elements nested in it. */
export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** How much the box's x axis is scaled on the canvas, e.g. by `transform: scale()`. */
  scaleX: number;
  /** How much the box's y axis is scaled on the canvas. */
  scaleY: number;
  /** Whichever of `scaleX` and `scaleY` is further from 1, so any value but 1 means the box is scaled. */
  scale: number;
  /** Text laid out in this box, each run positioned on the canvas. */
  runs: { text: string; x: number; y: number; width: number; height: number }[];
  /**
   * The element's attributes other than `class`, `id`, and `style`, such as
   * `data-*`. Absent when it has none, or when its parent's laid-out children
   * do not line up with its elements, as when inline content folds into runs.
   */
  attributes?: Record<string, string>;
  children: LayoutBox[];
}

/**
 * Rasterizes the `snapshot` surface's output.
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

/** Writes the `snapshot` surface's pages as a PDF, one page each. */
export interface TakumiPdfBackend {
  /**
   * Renders one page per entry in `pages`, each the input's size with no
   * margin, so a frame fills its page. Vector output with selectable text and
   * the registered fonts subset and embedded. Throws on an empty `pages` list.
   */
  pdf(input: PdfInput, options?: TakumiPdfOptions): Promise<Buffer>;
}

/** A {@link TakumiImageBackend} that also measures layout. */
export interface TakumiMeasuringBackend extends TakumiImageBackend {
  /** Lays the input out as {@link TakumiImageBackend.png} would, and returns every box, e.g. to find content past its area. */
  measure(input: ImageInput): Promise<LayoutBox>;
}

/** The formats a {@link TakumiBackend} writes, for `createIsomerRuntime({ formats })`. */
export const TAKUMI_FORMATS = ['png', 'svg', 'pdf'] as const;

/** Everything {@link createTakumiImageBackend} returns: raster, measure, and PDF. */
export interface TakumiBackend
  extends TakumiMeasuringBackend, TakumiPdfBackend {
  /** {@link TAKUMI_FORMATS}: one entry per method that writes a format. */
  readonly formats: typeof TAKUMI_FORMATS;
}

type Matrix = MeasuredNode['transform'];

type SourceNode = ReturnType<typeof fromHtml>['node'];

/** The canvas rectangle `transform` maps a local `width` × `height` box at `x`, `y` to. */
const mapRect = (
  [a, b, c, d, e, f]: Matrix,
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } => {
  const corners = [
    [x, y],
    [x + width, y],
    [x, y + height],
    [x + width, y + height],
  ].map(([px = 0, py = 0]) => [a * px + c * py + e, b * px + d * py + f]);
  const xs = corners.map(([cx = 0]) => cx);
  const ys = corners.map(([, cy = 0]) => cy);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
};

/**
 * Takumi reports each node's size in its own units with its full canvas
 * transform, and carries no attributes, so those come from the `fromHtml`
 * node at the same position.
 */
const toLayoutBox = (
  { width, height, transform, runs, children }: MeasuredNode,
  source: SourceNode | undefined
): LayoutBox => {
  const [a, b, c, d] = transform;
  const scaleX = Math.hypot(a, b);
  const scaleY = Math.hypot(c, d);
  const sources = source?.type === 'container' ? (source.children ?? []) : [];
  const paired = sources.length === children.length;
  return {
    ...mapRect(transform, 0, 0, width, height),
    scaleX,
    scaleY,
    scale: Math.abs(scaleY - 1) > Math.abs(scaleX - 1) ? scaleY : scaleX,
    runs: runs.map((run) => ({
      text: run.text,
      ...mapRect(transform, run.x, run.y, run.width, run.height),
    })),
    ...(source?.attributes && { attributes: { ...source.attributes } }),
    children: children.map((child, index) =>
      toLayoutBox(child, paired ? sources[index] : undefined)
    ),
  };
};

const escapeStyleEndTags = (css: string) =>
  css.replace(/<\/style/gi, (tag) => tag.replace('/', '\\/'));

/**
 * Inlines the stylesheet ahead of the markup, the form `fromHtml` lifts into
 * its own `css` list. Passing the stylesheet as a separate `CssInput` entry is
 * a different path through takumi and changes the committed PNG bytes.
 */
const withStylesheet = (css: string, markup: string) =>
  `<style>${escapeStyleEndTags(css)}</style>${markup}`;

const toTakumiSource = ({ html, css }: ImageInput) =>
  fromHtml(withStylesheet(css, html));

/** Inline, so no pack class name can collide with it. */
const PAGE_STYLE = 'overflow:hidden;break-after:page;break-inside:avoid';

/** Each page in a fixed-size block that ends the page, so a frame never spills onto the next. */
const toPagedSource = ({ pages, css, width, height }: PdfInput) => {
  if (pages.length === 0) {
    throw new Error('pdf: no pages; a document needs at least one');
  }
  const markup = pages
    .map(
      ({ html }) =>
        `<div style="width:${width}px;height:${height}px;${PAGE_STYLE}">${html}</div>`
    )
    .join('');
  return {
    ...fromHtml(withStylesheet(css, `<div>${markup}</div>`)),
    width,
    height,
  };
};

/** Runs `create` once for every caller. A rejection is forgotten, so the next call retries instead of inheriting it. */
const once = <T>(create: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= create().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
};

/**
 * Builds a {@link TakumiBackend} over one takumi renderer. `fonts` are
 * registered once, in order, before the first render; the PDF engine is
 * imported and created on the first `pdf`, and registers them again.
 */
export const createTakumiImageBackend = ({
  fonts = [],
  cacheMaxBytes,
}: TakumiImageBackendOptions = {}): TakumiBackend => {
  const renderer = new Renderer(
    cacheMaxBytes === undefined ? undefined : { cacheMaxBytes }
  );

  /**
   * Registration is async and every render needs it, so each engine registers
   * once and is awaited. Sequential because the registration order is the
   * default fallback order.
   */
  const registerFonts = async <
    TEngine extends { registerFont(font: FontLoader): Promise<unknown> },
  >(
    engine: TEngine
  ): Promise<TEngine> => {
    for (const font of fonts) {
      await engine.registerFont(font);
    }
    return engine;
  };
  const ready = once(() => registerFonts(renderer));
  /** A second engine, imported and created on the first PDF, so a raster-only host never loads its wasm. */
  const pdfReady = once(async () => {
    const { PdfRenderer } = await import('takumi-pdf');
    return registerFonts(new PdfRenderer());
  });

  return {
    formats: TAKUMI_FORMATS,
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
    measure: async (input) => {
      await ready();
      const { node, css } = toTakumiSource(input);
      const measured = await renderer.measure(node, {
        width: input.width,
        height: input.height,
        css,
      });
      return toLayoutBox(measured, node);
    },
    pdf: async (input, options = {}) => {
      const engine = await pdfReady();
      const { node, css, width, height } = toPagedSource(input);
      const renderOptions: PdfRenderOptions = {
        ...options,
        size: { width, height },
        margin: 0,
        css,
      };
      // Copied out of wasm memory, which a later render can move.
      return Buffer.from(await engine.render(node, renderOptions));
    },
  };
};
