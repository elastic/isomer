/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Drawing in Node: Elastic Charts mounts into one jsdom window whose canvases
// draw through Skia (`@napi-rs/canvas`). Installing that window replaces this
// thread's DOM globals, so it belongs on a worker thread or in a process that
// only draws.

import { readFileSync } from 'node:fs';

import type { Scene } from '@elastic/isomer-primitives-charts/scene';
import type { Canvas } from '@napi-rs/canvas';

import { euiHostStyles } from './host_styles';
import { chartsStylesheetPath, loadDrawingModules } from './worker_file.cjs';

export interface FontFile {
  readonly family: string;
  /** A TTF, OTF, WOFF or WOFF2 file, such as Kibana's own `Inter`. */
  readonly path: string;
}

export interface DrawOptions {
  /** Registered with Skia before the first drawing; text measures and draws in these. */
  readonly fonts?: readonly FontFile[];
  /** Device pixels per CSS pixel in the drawn images. Defaults to 2. */
  readonly pixelRatio?: number;
}

export interface DrawRequest {
  /** Defaults to the Scene's `size`. */
  readonly width?: number;
  readonly height?: number;
  /** Return Elastic Charts' `DebugState` with the drawing, as Kibana's functional tests read it. */
  readonly debugState?: boolean;
}

/** A chart as Elastic Charts drew it: markup whose canvases are PNG images, and the stylesheet it needs. */
export interface ChartDrawing {
  readonly html: string;
  readonly stylesheet: string;
  readonly width: number;
  readonly height: number;
  /** Elastic Charts' `DebugState`, when asked for and Elastic Charts reports one for the kind. */
  readonly debugState?: unknown;
}

export type SceneDraw = (scene: Scene, request?: DrawRequest) => ChartDrawing;

interface Environment {
  readonly window: Window & typeof globalThis;
  readonly canvases: Map<HTMLCanvasElement, Canvas>;
  readonly flushFrames: () => void;
  readonly releaseCanvases: () => void;
}

let installed: Environment | undefined;

/** The chart element an element sits in, found without jsdom's selector engine. */
const chartAncestor = (element: Element): HTMLElement | null => {
  for (let at: Element | null = element; at; at = at.parentElement) {
    if (at.classList.contains('echChart')) {
      return at as HTMLElement;
    }
  }
  return null;
};

// Skia's pixels live outside V8's heap, so garbage collection alone frees them too late.
const shrink = (canvas: Canvas): void => {
  canvas.width = 1;
  canvas.height = 1;
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

/** One jsdom window for the thread, installed as its globals before React DOM or Elastic Charts load. */
const install = async (pixelRatio: number): Promise<Environment> => {
  if (installed) {
    return installed;
  }
  const [{ JSDOM }, skia] = await Promise.all([
    import('jsdom'),
    import('@napi-rs/canvas'),
  ]);
  // The canvas spec draws an all-zero dash solid; Skia rejects it.
  const prototype = Object.getPrototypeOf(
    skia.createCanvas(1, 1).getContext('2d')
  ) as { setLineDash: (segments: number[]) => void };
  const { setLineDash } = prototype;
  prototype.setLineDash = function solidSafe(segments: number[]) {
    setLineDash.call(
      this,
      segments.every((segment) => segment === 0) ? [] : segments
    );
  };
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  // jsdom's selector engine compiles selectors with `new Function`, which a
  // server run with `--disallow-code-generation-from-strings` (as packaged
  // Kibana is) rejects. Emotion's cache looks for server-rendered style tags
  // when it loads; this window has none.
  const querySelectorAll = Reflect.get(
    window.Document.prototype,
    'querySelectorAll'
  );
  window.Document.prototype.querySelectorAll = function emotionSafe(
    this: Document,
    selectors: string
  ) {
    return selectors.startsWith('style[data-emotion')
      ? this.createElement('template').childNodes
      : querySelectorAll.call(this, selectors);
  };
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
      canvas = skia.createCanvas(width, height);
      canvases.set(this, canvas);
    }
    return canvas.getContext('2d');
  } as never;
  // Elastic Charts learns its size only from this callback, and jsdom has no layout.
  window.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(element: Element) {
      const chart = chartAncestor(element);
      const width = parseFloat(chart?.style.width ?? '') || 0;
      const height = parseFloat(chart?.style.height ?? '') || 0;
      this.callback(
        [
          {
            target: element,
            contentRect: { width, height, top: 0, left: 0 },
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
  for (const key of GLOBALS) {
    Object.defineProperty(globalThis, key, {
      value: (window as unknown as Record<string, unknown>)[key],
      configurable: true,
      writable: true,
    });
  }
  // Skia's own, so the paths and pixels drawn on its canvases are ones it accepts.
  Object.assign(globalThis, {
    Path2D: skia.Path2D,
    ImageData: skia.ImageData,
    DOMMatrix: skia.DOMMatrix,
  });
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = false;
  installed = {
    window: window as unknown as Window & typeof globalThis,
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
  return installed;
};

/** Closes a `minmax(…)` inside `repeat(…)` that Elastic Charts' Metric leaves open in its inline grid style. */
export const closeMetricGrid = (html: string): string =>
  html.replace(
    /repeat\((\d+), minmax\(([^()]*?), 1fr\)(?=;|")/g,
    'repeat($1, minmax($2, 1fr))'
  );

/**
 * Grid rows without `min-content`, which takumi cannot parse: content rows
 * become `auto` and the row that took the free space becomes `1fr`, the same
 * layout in a browser.
 */
export const contentRows = (css: string): string =>
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
 * computes. Elastic Charts' bottom legend uses them.
 */
export const fixedTracks = (css: string, width: number): string =>
  css.replace(
    /repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*([\d.]+)px\s*,([^()]*)\)\s*\)/g,
    (_, min: string, max: string) =>
      `repeat(${Math.max(1, Math.floor(width / parseFloat(min)))}, minmax(${min}px,${max}))`
  );

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

/**
 * Draws Scenes in this thread. The first call installs a jsdom window as the
 * thread's globals, so this belongs on a worker thread, which
 * `createElasticChartsNodeRenderer` starts, or in a process that only draws.
 */
export const createSceneDraw = async ({
  fonts = [],
  pixelRatio = 2,
}: DrawOptions = {}): Promise<SceneDraw> => {
  const environment = await install(pixelRatio);
  const skia = await import('@napi-rs/canvas');
  const {
    reactDom: { flushSync },
    client: { createRoot },
    engine,
  } = loadDrawingModules();
  for (const { path, family } of fonts) {
    skia.GlobalFonts.registerFromPath(path, family);
  }
  const host = euiHostStyles();
  const sheet = (scheme: 'light' | 'dark') =>
    `${host}${contentRows(readFileSync(chartsStylesheetPath(scheme), 'utf8'))}`;
  const stylesheets = { light: sheet('light'), dark: sheet('dark') };
  const plain = engine.createElasticChartsRenderer({ debugState: false });
  const debugging = engine.createElasticChartsRenderer({ debugState: true });
  const { document } = environment.window;
  return (scene, request = {}) => {
    const width = request.width ?? scene.size?.width;
    const height = request.height ?? scene.size?.height;
    if (width === undefined || height === undefined) {
      throw new Error(
        'elastic-charts-node: a drawing needs a size, from the request or the Scene'
      );
    }
    const sized: Scene = { ...scene, size: { width, height } };
    const renderer = request.debugState ? debugging : plain;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      flushSync(() =>
        root.render(renderer.render(sized, { environment: 'node' }))
      );
      environment.flushFrames();
      const chart = container.getElementsByClassName('echChart')[0] as
        HTMLElement | undefined;
      if (!chart) {
        throw new Error(
          `elastic-charts-node: the ${scene.kind} chart did not mount`
        );
      }
      const state = request.debugState
        ? chart
            .getElementsByClassName('echChartStatus')[0]
            ?.getAttribute('data-ech-debug-state')
        : undefined;
      return {
        html: serialize(chart, environment.canvases, width),
        stylesheet: stylesheets[scene.scheme],
        width,
        height,
        ...(state ? { debugState: JSON.parse(state) as unknown } : {}),
      };
    } finally {
      root.unmount();
      container.remove();
      environment.releaseCanvases();
    }
  };
};
