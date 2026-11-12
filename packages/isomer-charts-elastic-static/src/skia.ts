/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A Scene drawn by released Elastic Charts' own `<Chart>`, mounted in a jsdom
// window whose canvases draw through Skia (`@napi-rs/canvas`). The chart's
// markup goes inline into `snapshot` markup with each canvas as a PNG of its
// drawing, and Elastic Charts' stylesheet beside it, so an image backend
// rasterizes what Elastic Charts drew.

import { readFileSync } from 'node:fs';

import { createElement, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { DebugState } from '@elastic/charts';
import { createElasticChartsRenderer } from '@elastic/isomer-charts-elastic';
import { ariaDescriptionOf } from '@elastic/isomer-charts-elastic/engine';
import {
  cls,
  type ColorScheme,
  px,
  type Scene,
  type SceneEnvironment,
  type SceneKind,
  type SceneRenderer,
  varStyle,
} from '@elastic/isomer-primitives-charts/scene';
import {
  type Canvas,
  createCanvas,
  DOMMatrix,
  GlobalFonts,
  ImageData,
  Path2D,
} from '@napi-rs/canvas';
import { JSDOM } from 'jsdom';

import { euiHostStyles } from './host_styles';
import { staticModule } from './styles';

interface Environment {
  readonly window: JSDOM['window'];
  readonly globals: Readonly<Record<string, unknown>>;
  readonly canvases: Map<HTMLCanvasElement, Canvas>;
  readonly flushFrames: () => void;
  readonly releaseCanvases: () => void;
}

// Skia's pixels sit outside V8's heap, so garbage collection alone frees them too late.
const shrink = (canvas: Canvas): void => {
  canvas.width = 1;
  canvas.height = 1;
};

// The canvas spec draws an all-zero dash solid; Skia rejects it.
const patchLineDash = (): void => {
  const prototype = Object.getPrototypeOf(
    createCanvas(1, 1).getContext('2d')
  ) as { setLineDash: (segments: number[]) => void };
  const { setLineDash } = prototype;
  prototype.setLineDash = function solidSafe(segments: number[]) {
    setLineDash.call(
      this,
      segments.every((segment) => segment === 0) ? [] : segments
    );
  };
};

// jsdom's selector engine compiles selectors with `new Function`, which a
// server run with `--disallow-code-generation-from-strings` rejects, so nothing
// here reaches it: parents are walked and elements found by class.
const chartAncestor = (element: Element): HTMLElement | null => {
  for (let at: Element | null = element; at; at = at.parentElement) {
    if (at.classList.contains('echChart')) {
      return at as HTMLElement;
    }
  }
  return null;
};

const GLOBALS = [
  'window',
  'document',
  'navigator',
  'Element',
  'HTMLElement',
  'HTMLCanvasElement',
  'Node',
  'Text',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'DOMRect',
  'ResizeObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'devicePixelRatio',
] as const;

let environment: Environment | undefined;

/** One jsdom window for the process, made on the first draw. */
const environmentFor = (pixelRatio: number): Environment => {
  if (environment) {
    return environment;
  }
  patchLineDash();
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  const canvases = new Map<HTMLCanvasElement, Canvas>();
  window.HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    type: string
  ) {
    if (type !== '2d') {
      return null;
    }
    const width = this.width || 1;
    const height = this.height || 1;
    let canvas = canvases.get(this);
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      if (canvas) {
        shrink(canvas);
      }
      canvas = createCanvas(width, height);
      canvases.set(this, canvas);
    }
    return canvas.getContext('2d');
  } as never;
  // Elastic Charts learns its size only from this callback, and jsdom has no layout.
  window.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(element: Element) {
      const chart = chartAncestor(element);
      this.callback(
        [
          {
            target: element,
            contentRect: {
              width: parseFloat(chart?.style.width ?? '') || 0,
              height: parseFloat(chart?.style.height ?? '') || 0,
              top: 0,
              left: 0,
            },
          } as unknown as ResizeObserverEntry,
        ],
        this
      );
    }
    unobserve() {}
    disconnect() {}
  } as never;
  // jsdom's cascade matches every rule through its selector engine; this window holds inline styles only.
  window.getComputedStyle = (element: HTMLElement) => element.style;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
  Object.defineProperty(window, 'devicePixelRatio', {
    value: pixelRatio,
    configurable: true,
  });
  const frames: FrameRequestCallback[] = [];
  let frameId = 0;
  window.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return (frameId += 1);
  };
  window.cancelAnimationFrame = () => {};
  const windowGlobals = window as unknown as Record<string, unknown>;
  environment = {
    window,
    globals: {
      ...Object.fromEntries(GLOBALS.map((key) => [key, windowGlobals[key]])),
      // Skia's own, so paths and pixel data drawn on its canvases are ones it accepts.
      Path2D,
      ImageData,
      DOMMatrix,
      IS_REACT_ACT_ENVIRONMENT: false,
    },
    canvases,
    flushFrames: () => {
      for (let round = 0; round < 50 && frames.length > 0; round += 1) {
        for (const callback of frames.splice(0)) {
          callback(window.performance.now());
        }
      }
    },
    releaseCanvases: () => {
      for (const canvas of canvases.values()) {
        shrink(canvas);
      }
      canvases.clear();
    },
  };
  return environment;
};

/**
 * Runs `draw` with the window's globals installed, then restores what was
 * there, so a host thread keeps no DOM globals and the charts pack still sees
 * Node.
 */
const withGlobals = <T>({ globals }: Environment, draw: () => T): T => {
  const target = globalThis as Record<string, unknown>;
  const saved = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(target, key)] as const
  );
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(target, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  try {
    return draw();
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) {
        Object.defineProperty(target, key, descriptor);
      } else {
        delete target[key];
      }
    }
  }
};

/** jsdom's style serializer drops the closing parenthesis of the Metric's nested `repeat(…, minmax(…))`. */
const closeMetricGrid = (html: string): string =>
  html.replace(
    /repeat\((\d+), minmax\(([^()]*?), 1fr\)(?=;|")/g,
    'repeat($1, minmax($2, 1fr))'
  );

/**
 * Grid rows without `min-content`, which takumi cannot parse: content rows
 * become `auto` and the row that absorbed the free space becomes `1fr`, the
 * same layout in a browser.
 */
const contentRows = (css: string): string =>
  css.replace(/grid-template-rows:\s*([^;"}]*)/g, (_, rows: string) =>
    rows.includes('min-content')
      ? `grid-template-rows:${rows
          .split(/\s+/)
          .map((row) =>
            row === 'auto'
              ? '1fr'
              : row.replace(/^(-webkit-)?min-content$/, 'auto')
          )
          .join(' ')}`
      : `grid-template-rows:${rows}`
  );

/**
 * Grid tracks without `auto-fill` or `auto-fit`, which takumi cannot lay out:
 * as many `minmax(<size>px, …)` tracks as fit in `width`, the count a browser
 * computes for the chart's width. Elastic Charts' bottom legend uses them.
 */
export const fixedTracks = (css: string, width: number): string =>
  css.replace(
    /repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*([\d.]+)px\s*,([^()]*)\)\s*\)/g,
    (_, min: string, max: string) =>
      `repeat(${Math.max(1, Math.floor(width / parseFloat(min)))}, minmax(${min}px,${max}))`
  );

const stylesheets = new Map<ColorScheme, string>();

/** Elastic Charts' stylesheet for `scheme`, over the page it expects: EUI's reset and body font, as in Kibana. */
export const elasticChartsSheet = (scheme: ColorScheme): string => {
  let sheet = stylesheets.get(scheme);
  if (sheet === undefined) {
    sheet = `${euiHostStyles()}${contentRows(
      readFileSync(
        require.resolve(`@elastic/charts/dist/theme_${scheme}.css`),
        'utf8'
      )
    )}`;
    stylesheets.set(scheme, sheet);
  }
  return sheet;
};

/** The chart as markup: each canvas becomes an image of its Skia drawing, sized as the canvas was. */
const serialize = (
  chart: HTMLElement,
  canvases: Map<HTMLCanvasElement, Canvas>,
  width: number
): string => {
  for (const element of [...chart.getElementsByTagName('canvas')]) {
    const canvas = canvases.get(element);
    const image = chart.ownerDocument.createElement('img');
    image.setAttribute('alt', '');
    image.setAttribute('style', element.getAttribute('style') ?? '');
    image.className = element.className;
    if (canvas) {
      image.setAttribute(
        'src',
        `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`
      );
    }
    element.replaceWith(image);
  }
  return fixedTracks(contentRows(closeMetricGrid(chart.outerHTML)), width);
};

/** What {@link createElasticChartsStaticRenderer} takes. */
export interface StaticRendererOptions {
  /** Font files registered with Skia before the first drawing; canvas text measures and draws in these. */
  readonly fonts?: readonly {
    readonly family: string;
    readonly path: string;
  }[];
  /** Device pixels per CSS pixel in the canvases' images. Absent: 2. */
  readonly pixelRatio?: number;
  /**
   * Where the renderer runs. Absent: Node alone. Add `browser` where markup
   * is static, such as a preview of the `html` or `snapshot` surface.
   */
  readonly environments?: readonly SceneEnvironment[];
}

/** A Scene drawn by {@link drawScene}: its markup, box and what Elastic Charts reports. */
export interface StaticDrawing {
  readonly html: string;
  readonly width: number;
  readonly height: number;
  readonly debugState?: DebugState;
}

const browserRenderer = createElasticChartsRenderer({ debugState: true });
const registered = new Set<string>();

/** Draws `scene` at its `size` with Elastic Charts in the jsdom window. */
export const drawScene = (
  scene: Scene,
  {
    fonts = [],
    pixelRatio = 2,
  }: Pick<StaticRendererOptions, 'fonts' | 'pixelRatio'> = {}
): StaticDrawing => {
  if (!scene.size) {
    throw new Error(
      `isomer-charts-elastic-static: a static ${scene.kind} Scene needs a size; resolve it with one`
    );
  }
  const { width, height } = scene.size;
  for (const { family, path } of fonts) {
    if (!registered.has(path)) {
      GlobalFonts.registerFromPath(path, family);
      registered.add(path);
    }
  }
  const env = environmentFor(pixelRatio);
  return withGlobals(env, () => {
    const { document } = env.window;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      flushSync(() =>
        root.render(
          browserRenderer.render(scene, { environment: 'browser' }) as never
        )
      );
      env.flushFrames();
      const chart = container.getElementsByClassName('echChart')[0] as
        HTMLElement | undefined;
      const raw = container
        .getElementsByClassName('echChartStatus')[0]
        ?.getAttribute('data-ech-debug-state');
      const drawn =
        chart ?? (container.firstElementChild as HTMLElement | null);
      if (!drawn) {
        throw new Error(`a ${scene.kind} Scene did not mount`);
      }
      return {
        html: serialize(drawn, env.canvases, width),
        width,
        height,
        ...(raw ? { debugState: JSON.parse(raw) as DebugState } : {}),
      };
    } finally {
      root.unmount();
      container.remove();
      env.releaseCanvases();
    }
  });
};

const KINDS: readonly SceneKind[] = ['metric', 'xy', 'partition'];

/**
 * A `SceneRenderer` drawing the chart as Elastic Charts' markup, with its
 * canvases as images and its stylesheet inline, in a `div`, so static markup,
 * such as the `snapshot` surface's, carries it to an image backend. It is
 * `sized`: every Scene it draws carries a size. Register it in the charts
 * pack's `sceneRenderers`, since `snapshot` takes no host context.
 */
export const createElasticChartsStaticRenderer = ({
  environments = ['node'],
  ...options
}: StaticRendererOptions = {}): SceneRenderer<ReactNode> => ({
  id: 'elastic-charts-static',
  environments,
  sized: true,
  supports: (kind) => KINDS.includes(kind),
  render: (scene, env) => {
    const { html, width, height } = drawScene(scene, options);
    const { handles, vars } = staticModule;
    return createElement('div', {
      role: 'img',
      ...(scene.title === undefined ? {} : { 'aria-label': scene.title }),
      'aria-description': ariaDescriptionOf(scene),
      className: cls(env, handles.drawing),
      style: varStyle(vars.box, { width: px(width), height: px(height) }),
      dangerouslySetInnerHTML: {
        __html: `<style>${elasticChartsSheet(scene.scheme)}</style>${html}`,
      },
    });
  },
});
