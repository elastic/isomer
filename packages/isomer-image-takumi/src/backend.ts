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

import {
  createInlinePdfEngine,
  createWorkerPdfEngine,
  type PdfEngine,
} from './pdf_engine';

/**
 * How the output's height is decided, mirroring the SDK's `FrameSizing`.
 *
 * - `fixed`: the input's `height`.
 * - `content`: the height the markup lays out to at the input's `width`, so
 *   the input's `height` is only an estimate and is not read. The root's own
 *   height decides: a root pinned to a height measures as that height, and a
 *   percentage height does not resolve.
 */
export type HeightMode = 'fixed' | 'content';

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
  /** The viewport, in CSS pixels; the output is this size unless `heightMode` is `content`. */
  width: number;
  height: number;
  /** Defaults to `fixed`. See {@link HeightMode}. */
  heightMode?: HeightMode | undefined;
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
  /** Defaults to `fixed`. Under `content`, every page is the height of the tallest laid-out page. */
  heightMode?: HeightMode | undefined;
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
  /**
   * Where the PDF engine runs. Takumi's PDF engine is WebAssembly and lays
   * out and writes synchronously, so on the calling thread a PDF blocks its
   * event loop for the whole render. `'worker'`, the default, runs it in a
   * `worker_threads` Worker, started on the first `pdf` or `fitPages` and
   * holding the process open only while a call is in flight; `'inline'`
   * keeps it on the calling thread, e.g. when the host already calls from a
   * worker of its own. The raster engine is native and always renders off
   * the calling thread.
   */
  pdfThread?: 'worker' | 'inline';
}

/** Per-render overrides. Geometry comes from the input, not from here. */
export interface TakumiRenderOptions {
  /**
   * Raster pixels per CSS pixel: the PNG is `input.width * scale` by
   * `input.height * scale`, rounded. A layout fixed in CSS pixels is
   * unchanged; rounding moves the viewport by under half a raster pixel. `2`
   * gives a 2x raster. Defaults to `1`.
   */
  scale?: number;
  /**
   * Takumi's zoom at a fixed canvas: the tree is laid out at
   * `input.width / devicePixelRatio` CSS pixels and magnified to fill the
   * canvas, so above `1` the PNG keeps its size and shows less of the frame.
   * For a larger raster, use {@link TakumiRenderOptions.scale}.
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
  /**
   * The input with `heightMode: 'content'` resolved: `height` set to what the
   * markup lays out to, in CSS pixels, and `heightMode` to `fixed`. Any other
   * input is returned as it is. Costs a layout pass and no raster, so a
   * caller that needs the height as well as the image measures once and
   * renders the result. `devicePixelRatio` is the zoom `png` will use, if any.
   *
   * Optional so a custom backend need not measure; {@link renderPng} then
   * reports the input's estimate as the height.
   */
  fit?(
    input: ImageInput,
    options?: Pick<TakumiRenderOptions, 'devicePixelRatio'>
  ): Promise<ImageInput>;
}

/** Writes the `snapshot` surface's pages as a PDF, one page each. */
export interface TakumiPdfBackend {
  /**
   * Renders one page per entry in `pages`, each the input's size with no
   * margin, so a frame fills its page. Vector output with selectable text and
   * the registered fonts subset and embedded. Throws on an empty `pages` list.
   * Under `heightMode: 'content'`, each page is laid out once more to find the
   * tallest, and every page takes that height.
   */
  pdf(input: PdfInput, options?: TakumiPdfOptions): Promise<Buffer>;
  /**
   * {@link TakumiImageBackend.fit} for pages: `height` set to the tallest
   * laid-out page, as the PDF engine lays it out, and `heightMode` to
   * `fixed`. Optional so a custom backend need not measure.
   */
  fitPages?(input: PdfInput, options?: TakumiPdfOptions): Promise<PdfInput>;
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
  fit: NonNullable<TakumiImageBackend['fit']>;
  fitPages: NonNullable<TakumiPdfBackend['fitPages']>;
  /**
   * Releases the PDF engine and stops its worker, if either was started. A
   * later `pdf` or `fitPages` starts a fresh one; calls in flight reject.
   */
  close(): Promise<void>;
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

const toTakumiSource = ({ html, css }: Pick<ImageInput, 'html' | 'css'>) =>
  fromHtml(withStylesheet(css, html));

/**
 * The viewport takumi lays out against. Under `content`, `height` is left out
 * and takumi sizes the canvas to the root, in one layout pass.
 */
const viewportOf = ({ width, height, heightMode }: ImageInput) =>
  heightMode === 'content' ? { width } : { width, height };

/** A laid-out height as a canvas side: whole pixels, never empty. */
const toCanvasHeight = (height: number) => Math.max(1, Math.ceil(height));

/**
 * One side of a scaled canvas, in whole pixels. Takumi takes one ratio for
 * both axes, so the ratio stays `scale` and the canvas absorbs the rounding.
 */
const toRasterSide = (side: number, scale: number) =>
  scale === 1 ? side : Math.max(1, Math.round(side * scale));

/** Inline, so no pack class name can collide with it. */
const PAGE_STYLE =
  'position:relative;overflow:hidden;break-after:page;break-inside:avoid';

/** Out of flow, so the PDF engine cannot fragment clipped content onto pages of its own. */
const PAGE_CONTENT_STYLE = 'position:absolute;inset:0';

/**
 * One page's block: `width` wide and ending the page, so a frame never spills
 * onto the next. Without `height` the content stays in flow and the block
 * takes its height, which is how a page is measured in the context it is
 * drawn in.
 */
const pageBlock = (html: string, width: number, height?: number) =>
  height === undefined
    ? `<div style="width:${width}px;${PAGE_STYLE}"><div>${html}</div></div>`
    : `<div style="width:${width}px;height:${height}px;${PAGE_STYLE}"><div style="${PAGE_CONTENT_STYLE}">${html}</div></div>`;

/** Every page in its fixed-size block, inside the one root the PDF engine draws. */
const toPagedSource = ({ pages, css, width, height }: PdfInput) => {
  if (pages.length === 0) {
    throw new Error('pdf: no pages; a document needs at least one');
  }
  const markup = pages
    .map(({ html }) => pageBlock(html, width, height))
    .join('');
  return {
    ...fromHtml(withStylesheet(css, `<div>${markup}</div>`)),
    width,
    height,
  };
};

/**
 * Runs `create` once for every caller. A rejection is forgotten, so the next
 * call retries instead of inheriting it, and so is a value `reset` drops.
 */
const once = <T>(
  create: (reset: () => void, signal: AbortSignal) => Promise<T>
): {
  get: () => Promise<T>;
  /** Forgets the value and aborts its creation, returning what it was, if anything. */
  take: () => Promise<T> | undefined;
} => {
  let pending: { value: Promise<T>; controller: AbortController } | undefined;
  const take = () => {
    const taken = pending;
    pending = undefined;
    taken?.controller.abort();
    return taken?.value;
  };
  const get = () => {
    const controller = new AbortController();
    const forget = () => {
      if (pending?.controller === controller) {
        pending = undefined;
      }
    };
    const value = create(forget, controller.signal).catch((error: unknown) => {
      forget();
      throw error;
    });
    return { value, controller };
  };
  return {
    get: () => (pending ??= get()).value,
    take,
  };
};

/**
 * Builds a {@link TakumiBackend} over one takumi renderer. `fonts` are
 * registered once, in order, before the first render; the PDF engine is
 * imported and created on the first `pdf`, in a worker unless `pdfThread` is
 * `'inline'`, and registers them again.
 */
export const createTakumiImageBackend = ({
  fonts = [],
  cacheMaxBytes,
  pdfThread = 'worker',
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
  const ready = once(() => registerFonts(renderer)).get;
  /** A second engine, created on the first PDF, so a raster-only host never loads its wasm. */
  const pdfEngine = once<PdfEngine>((reset, signal) =>
    pdfThread === 'inline'
      ? createInlinePdfEngine(fonts, signal)
      : createWorkerPdfEngine(fonts, reset, signal)
  );
  const pdfReady = pdfEngine.get;

  /**
   * Each page laid out alone by the PDF engine, in the page block `pdf` draws
   * it in but with no height, as a single-page viewport sizes to content, so
   * the height matches what `pdf` draws rather than the raster engine's layout.
   * `engine` is only acquired when a page needs measuring.
   */
  const fitPagesOn = async (
    getEngine: () => Promise<PdfEngine>,
    input: PdfInput,
    { images, lang }: Pick<TakumiPdfOptions, 'images' | 'lang'> = {}
  ): Promise<PdfInput> => {
    if (input.heightMode !== 'content' || input.pages.length === 0) {
      return input;
    }
    const engine = await getEngine();
    const heights: number[] = [];
    for (const page of input.pages) {
      const { node, css } = fromHtml(
        withStylesheet(
          input.css,
          `<div>${pageBlock(page.html, input.width)}</div>`
        )
      );
      const { height } = await engine.measure(node, {
        viewport: { width: input.width },
        css,
        ...(images === undefined ? {} : { images }),
        ...(lang === undefined ? {} : { lang }),
      });
      heights.push(height);
    }
    return {
      ...input,
      height: toCanvasHeight(Math.max(...heights)),
      heightMode: 'fixed',
    };
  };

  return {
    formats: TAKUMI_FORMATS,
    png: async (input, { scale = 1, devicePixelRatio } = {}) => {
      if (!Number.isFinite(scale) || scale <= 0) {
        throw new RangeError(
          `png: scale must be a positive finite number, got ${scale}`
        );
      }
      await ready();
      const { node, css } = toTakumiSource(input);
      const renderOptions: RenderOptions = {
        width: toRasterSide(input.width, scale),
        format: 'png',
        css,
      };
      if (input.heightMode !== 'content') {
        renderOptions.height = toRasterSide(input.height, scale);
      }
      if (devicePixelRatio !== undefined || scale !== 1) {
        renderOptions.devicePixelRatio = (devicePixelRatio ?? 1) * scale;
      }
      return renderer.render(node, renderOptions);
    },
    svg: async (input) => {
      await ready();
      const { node, css } = toTakumiSource(input);
      return renderer.renderSvg(node, { ...viewportOf(input), css });
    },
    measure: async (input) => {
      await ready();
      const { node, css } = toTakumiSource(input);
      const measured = await renderer.measure(node, {
        ...viewportOf(input),
        css,
      });
      return toLayoutBox(measured, node);
    },
    fit: async (input, { devicePixelRatio } = {}) => {
      if (input.heightMode !== 'content') {
        return input;
      }
      await ready();
      const { node, css } = toTakumiSource(input);
      const measured = await renderer.measure(node, {
        width: input.width,
        css,
        ...(devicePixelRatio === undefined ? {} : { devicePixelRatio }),
      });
      return {
        ...input,
        height: toCanvasHeight(measured.height),
        heightMode: 'fixed',
      };
    },
    fitPages: (input, options) => fitPagesOn(pdfReady, input, options),
    pdf: async (input, options = {}) => {
      // Measured and drawn on one engine, so `close` cannot start another.
      const engine = await pdfReady();
      const { node, css, width, height } = toPagedSource(
        await fitPagesOn(() => Promise.resolve(engine), input, options)
      );
      const renderOptions: PdfRenderOptions = {
        ...options,
        size: { width, height },
        margin: 0,
        css,
      };
      const bytes = await engine.render(node, renderOptions);
      return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    },
    close: async () => {
      const engine = await pdfEngine.take()?.catch(() => undefined);
      await engine?.close();
    },
  };
};
