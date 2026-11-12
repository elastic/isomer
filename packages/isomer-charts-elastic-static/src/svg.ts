/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A Scene drawn by Elastic Charts' own `<Chart renderer="svg">`
// (elastic/elastic-charts#2941), mounted in a jsdom window. The chart's markup,
// SVG and HTML, goes inline into `snapshot` markup with Elastic Charts'
// stylesheet beside it, so an image backend rasterizes what Elastic Charts drew.

import { readFileSync } from 'node:fs';

import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Chart, type DebugState } from '@elastic/charts';
import { createElasticChartsRenderer } from '@elastic/isomer-charts-elastic';
import {
  ariaDescriptionOf,
  emptyTextOf,
} from '@elastic/isomer-charts-elastic/engine';
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
import { JSDOM } from 'jsdom';

import { euiHostStyles } from './host_styles';
import { staticModule } from './styles';

/** Measures `text` drawn in a CSS `font`, in CSS pixels. */
export type TextWidthMeasure = (text: string, font: string) => number;

// Helvetica advance widths, per 1000 units, for code points 32–126.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

const FONT_SIZE = /(\d+(?:\.\d+)?)px/;

const fontSizeOf = (font: string): number =>
  Number(FONT_SIZE.exec(font)?.[1] ?? 10);

/** Text widths from Helvetica's advance widths; bold is 7% wider. */
export const measureHelvetica: TextWidthMeasure = (text, font) => {
  const before = font.slice(0, FONT_SIZE.exec(font)?.index ?? 0);
  const weight = Number(/\b([1-9]00)\b/.exec(before)?.[1] ?? 0);
  const bold = weight >= 500 || /\bbold(er)?\b/.test(before);
  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    units += code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32]! : 556;
  }
  return (units / 1000) * fontSizeOf(font) * (bold ? 1.07 : 1);
};

// Ascent as a fraction of the font size, by baseline; descent fills the rest of 0.98.
const BASELINE_ASCENT: Readonly<Record<string, number>> = {
  alphabetic: 0.77,
  top: 0,
  hanging: 0.05,
  middle: 0.42,
  ideographic: 0.98,
  bottom: 0.98,
};

/** The part of a 2D context Elastic Charts measures text with; under the SVG renderer it draws on none. */
const measureContext = (measure: () => TextWidthMeasure) => {
  const stack: { font: string; textBaseline: string; textAlign: string }[] = [];
  const context = {
    font: '10px sans-serif',
    textBaseline: 'alphabetic',
    textAlign: 'start',
    direction: 'inherit',
    save() {
      const { font, textBaseline, textAlign } = context;
      stack.push({ font, textBaseline, textAlign });
    },
    restore() {
      Object.assign(context, stack.pop() ?? {});
    },
    measureText(text: string) {
      const size = fontSizeOf(context.font);
      const ascent = (BASELINE_ASCENT[context.textBaseline] ?? 0.77) * size;
      const width = measure()(text, context.font);
      return {
        width,
        actualBoundingBoxAscent: ascent,
        actualBoundingBoxDescent: 0.98 * size - ascent,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        fontBoundingBoxAscent: ascent,
        fontBoundingBoxDescent: 0.98 * size - ascent,
      };
    },
  };
  return context;
};

interface Environment {
  readonly window: JSDOM['window'];
  readonly globals: Readonly<Record<string, unknown>>;
  readonly flushFrames: () => void;
}

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
  'SVGElement',
  'SVGSVGElement',
  'Node',
  'Text',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'DOMRect',
  'ResizeObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
] as const;

let environment: Environment | undefined;
let activeMeasure: TextWidthMeasure = measureHelvetica;

/** One jsdom window for the process, made on the first draw. */
const environmentFor = (): Environment => {
  if (environment) {
    return environment;
  }
  const { window } = new JSDOM('<!doctype html><html><body></body></html>');
  const context = measureContext(() => activeMeasure);
  window.HTMLCanvasElement.prototype.getContext = function getContext(
    type: string
  ) {
    return type === '2d' ? context : null;
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
      IS_REACT_ACT_ENVIRONMENT: false,
    },
    flushFrames: () => {
      for (let round = 0; round < 50 && frames.length > 0; round += 1) {
        for (const callback of frames.splice(0)) {
          callback(window.performance.now());
        }
      }
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

/** A short, stable name for a drawing: the same markup always gets the same one. */
const drawingScope = (markup: string): string => {
  let hash = 5381;
  for (let index = 0; index < markup.length; index += 1) {
    hash = ((hash * 33) ^ markup.charCodeAt(index)) >>> 0;
  }
  return `ech${hash.toString(36)}`;
};

/**
 * Prefixes every id in markup and each reference to one. Elastic Charts names
 * its clip paths `clip0`, `clip1`, …, so two charts inline in one page would
 * otherwise clip with each other's paths. Identical drawings share a prefix,
 * and their paths are identical too.
 */
export const scopeSvgIds = (markup: string, scope: string): string =>
  // Only inside tags, so text such as a label reading `url(#clip0)` stays as drawn.
  markup.replace(/<[^>]+>/g, (tag) =>
    tag
      .replace(/\bid="([^"]+)"/g, `id="${scope}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`)
      .replace(/\bhref="#([^"]+)"/g, `href="#${scope}-$1"`)
      .replace(
        /\b(aria-labelledby|aria-describedby)="([^"]+)"/g,
        (_, name: string, ids: string) =>
          `${name}="${ids
            .split(/\s+/)
            .map((id) => `${scope}-${id}`)
            .join(' ')}"`
      )
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

/** What {@link createElasticChartsStaticRenderer} takes. */
export interface StaticRendererOptions {
  /** Measures text Elastic Charts lays out. Absent: {@link measureHelvetica}. */
  readonly measureTextWidth?: TextWidthMeasure;
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

/** The browser engine's drawing of `scene`, its `<Chart>` switched to Elastic Charts' SVG renderer. */
const svgChart = (scene: Scene): ReactNode => {
  const drawn = browserRenderer.render(scene, { environment: 'browser' });
  return isValidElement(drawn) && drawn.type === Chart
    ? cloneElement(drawn, { renderer: 'svg' } as never)
    : drawn;
};

const RENDER_PASSES = 8;

/** Draws `scene` at its `size` with Elastic Charts in the jsdom window. */
export const drawScene = (
  scene: Scene,
  {
    measureTextWidth = measureHelvetica,
  }: Pick<StaticRendererOptions, 'measureTextWidth'> = {}
): StaticDrawing => {
  if (!scene.size) {
    throw new Error(
      `isomer-charts-elastic-static: a static ${scene.kind} Scene needs a size; resolve it with one`
    );
  }
  const { width, height } = scene.size;
  const env = environmentFor();
  return withGlobals(env, () => {
    const { document } = env.window;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    activeMeasure = measureTextWidth;
    try {
      flushSync(() => root.render(svgChart(scene) as never));
      const status = () =>
        container.getElementsByClassName('echChartStatus')[0];
      for (
        let pass = 0;
        pass < RENDER_PASSES &&
        status() &&
        status()!.getAttribute('data-ech-render-complete') !== 'true';
        pass += 1
      ) {
        env.flushFrames();
        flushSync(() => {});
      }
      if (
        emptyTextOf(scene) === undefined &&
        status()?.getAttribute('data-ech-render-complete') !== 'true'
      ) {
        throw new Error(`a ${scene.kind} Scene did not finish drawing`);
      }
      const chart = container.getElementsByClassName('echChart')[0] as
        HTMLElement | undefined;
      const raw = status()?.getAttribute('data-ech-debug-state');
      const drawn =
        chart ?? (container.firstElementChild as HTMLElement | null);
      if (!drawn) {
        throw new Error(`a ${scene.kind} Scene did not mount`);
      }
      const markup = fixedTracks(
        contentRows(closeMetricGrid(drawn.outerHTML)),
        width
      );
      return {
        html: scopeSvgIds(markup, drawingScope(markup)),
        width,
        height,
        ...(raw ? { debugState: JSON.parse(raw) as DebugState } : {}),
      };
    } finally {
      root.unmount();
      container.remove();
      activeMeasure = measureHelvetica;
    }
  });
};

const KINDS: readonly SceneKind[] = ['metric', 'xy', 'partition'];

/**
 * A `SceneRenderer` drawing the chart as Elastic Charts' SVG and HTML markup,
 * with its stylesheet inline, in a `div`, so static markup, such as the
 * `snapshot` surface's, carries it to an image backend. It is `sized`: every
 * Scene it draws carries a size. Register it in the charts pack's
 * `sceneRenderers`, since `snapshot` takes no host context.
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
