/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A live Vega view in a browser: the server's SVG replaced by Vega's own
// renderer, with tooltips and signals, under the same loader, interpreter,
// scene scrub and event rules, and raising chart events where the node
// offers them.

import type { ChartEvent } from '@elastic/isomer-primitives-charts/schema';
import { type Loader, parse, renderModule, View } from 'vega';
import { formatValue, Handler } from 'vega-tooltip';

import { markSelectEvent, signalBrushEvent } from '../primitives/vega/events';
import { MAX_DRAWN_ITEMS, type VegaNode } from '../primitives/vega/schema';
import { hardenVegaSpec, type SpecObject } from '../schema';

import { expressionEvaluator } from './interpreter';
import { countDrawn } from './render';
import { KEYWORD, safeBackground, scrubScene } from './scene';

const refuse = () => Promise.reject(new Error('vega: refused'));

/** Rejects every request, links included: a resolved empty href would navigate to the page itself. */
const clientLoader: Loader = {
  load: refuse,
  sanitize: refuse,
  http: refuse,
  file: refuse,
};

/** Only the DOM SVG renderer surface the scrubbing subclass touches. */
interface SvgRendererBase {
  _render(scene: unknown, markTypes: unknown): unknown;
  background(...color: unknown[]): unknown;
}

interface SvgModule {
  renderer: new (loader: Loader) => SvgRendererBase;
  headless: unknown;
  handler: unknown;
}

const SCRUBBED_SVG = 'isomer-scrubbed-svg';

/**
 * Registers, once, Vega's DOM SVG renderer with the server's scene scrub run
 * before every draw, since signals and data re-set links and styles on each
 * update, and with no draw past the mark cap: the last drawing stays.
 */
const registerScrubbedSvg = () => {
  // `vega-typings` declares only the two-argument registration form.
  const lookup = renderModule as unknown as (
    name: string,
    module?: SvgModule
  ) => SvgModule | undefined;
  if (lookup(SCRUBBED_SVG) !== undefined) {
    return;
  }
  const base = lookup('svg');
  if (base === undefined) {
    throw new Error('vega: the svg render module is not registered');
  }
  class ScrubbedSvgRenderer extends base.renderer {
    override _render(scene: unknown, markTypes: unknown) {
      if (countDrawn(scene) > MAX_DRAWN_ITEMS) {
        return this;
      }
      scrubScene(scene);
      return super._render(scene, markTypes);
    }

    override background(...color: unknown[]) {
      return color.length === 0
        ? super.background()
        : super.background(safeBackground(color[0]));
    }
  }
  lookup(SCRUBBED_SVG, { ...base, renderer: ScrubbedSvgRenderer });
};

/** The default tooltip text without an object's `image`, which the handler would load from a URL in the data. */
const formatTooltip: NonNullable<
  ConstructorParameters<typeof Handler>[0]
>['formatTooltip'] = (value, valueToHtml, maxDepth, baseURL) => {
  if (typeof value === 'object' && value !== null && 'image' in value) {
    const { image: _image, ...rest } = value as Record<string, unknown>;
    return formatValue(rest, valueToHtml, maxDepth, baseURL);
  }
  return formatValue(value, valueToHtml, maxDepth, baseURL);
};

/** The `cursor` accessors on `style`'s prototype chain, where a browser declares them. */
const nativeCursor = (style: CSSStyleDeclaration) => {
  for (
    let proto = Object.getPrototypeOf(style) as object | null;
    proto !== null;
    proto = Object.getPrototypeOf(proto) as object | null
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'cursor');
    if (descriptor?.get && descriptor.set) {
      return descriptor;
    }
  }
  return undefined;
};

/**
 * Keeps the cursor Vega sets on `element` to a keyword, as the spec walk does: a `cursor` signal can still yield a
 * `url(...)`. Defined on the element's own `style` whatever the browser's prototypes hold; Chromium declares no
 * `cursor` accessor, so there it writes through `setProperty`.
 */
const guardCursor = (element: HTMLElement) => {
  const { style } = element;
  const native = nativeCursor(style);
  Object.defineProperty(style, 'cursor', {
    configurable: true,
    get: () =>
      native?.get
        ? (native.get.call(style) as string)
        : style.getPropertyValue('cursor'),
    set: (value: unknown) => {
      const keyword =
        typeof value === 'string' && KEYWORD.test(value) ? value : '';
      if (native?.set) {
        native.set.call(style, keyword);
      } else {
        style.setProperty('cursor', keyword);
      }
    },
  });
};

/** The `width` and `height` of the root of `markup`, an SVG drawing. */
const svgSize = (markup: string) => {
  const template = document.createElement('template');
  template.innerHTML = markup;
  const svg = template.content.querySelector('svg');
  return {
    width: Number(svg?.getAttribute('width')),
    height: Number(svg?.getAttribute('height')),
  };
};

/**
 * Whether the live drawing differs from the server's size, or its container is narrower and scales it down: Vega
 * maps the pointer without CSS scaling, so a scaled view would brush and read `x()` at the wrong values.
 */
const isScaled = (container: HTMLElement, server: string) => {
  const drawn = svgSize(server);
  if (!(drawn.width > 0 && drawn.height > 0)) {
    return false;
  }
  const live = container.querySelector('svg');
  const differs = (side: 'width' | 'height') =>
    Math.abs(Number(live?.getAttribute(side)) - drawn[side]) > 0.5;
  return (
    differs('width') ||
    differs('height') ||
    (container.clientWidth > 0 && container.clientWidth < drawn.width)
  );
};

/**
 * Calls `demote` once `container` comes to scale `view`'s drawing, as a panel that narrows does, after finalizing
 * the view. Stops watching when the view is finalized.
 */
const watchScale = (container: HTMLElement, view: View, demote: () => void) => {
  if (typeof ResizeObserver === 'undefined') {
    return;
  }
  const svg = container.querySelector('svg')?.outerHTML ?? '';
  const observer = new ResizeObserver(() => {
    if (isScaled(container, svg)) {
      view.finalize();
      demote();
    }
  });
  const finalize = view.finalize.bind(view);
  view.finalize = () => {
    observer.disconnect();
    return finalize();
  };
  observer.observe(container);
};

/** The view live in each container, so a new start replaces it rather than leaving it running. */
const liveViews = new WeakMap<HTMLElement, View>();
/** The server's drawing in each container, and its role, which a failed start puts back. */
const serverDrawings = new WeakMap<
  HTMLElement,
  { svg: string; role: string | null }
>();

const setAttribute = (element: Element, name: string, value: string | null) => {
  if (value === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, value);
  }
};

/** What a live view raises events for: the node's `id`, `data` and `interactions`. */
export type LiveVegaNode = Pick<VegaNode, 'id' | 'data' | 'interactions'>;

export interface LiveViewOptions {
  /** Raises each chart event the node offers. Absent: the view raises none. */
  readonly onEvent?: (event: ChartEvent) => void;
  readonly node?: LiveVegaNode;
  /** The server's SVG the container shows when no view is live. Absent: what it held before its first view. */
  readonly serverSvg?: string;
}

/**
 * Draws `spec` into `container` as a live view, replacing what it holds and any view live there, and wires the
 * node's `mark` selection and brush signal to `onEvent`. Resolves once the first render is done; finalize the view
 * to remove it. A view that fails to start, draws past the mark cap or would be scaled, or that its container later
 * comes to scale, is finalized, and `container` gets the server's SVG back.
 */
export const startLiveView = async (
  container: HTMLElement,
  spec: SpecObject,
  { onEvent, node, serverSvg }: LiveViewOptions = {}
): Promise<View> => {
  const recorded = serverDrawings.get(container);
  const server = {
    svg: serverSvg ?? recorded?.svg ?? container.innerHTML,
    role: recorded ? recorded.role : container.getAttribute('role'),
  };
  serverDrawings.set(container, server);
  // Vega's `initialize` writes its own role and label on the container, over the chart's.
  const label = container.getAttribute('aria-label');
  const restoreAria = (role: string | null) => {
    setAttribute(container, 'role', role);
    setAttribute(container, 'aria-label', label);
    container.removeAttribute('aria-roledescription');
  };
  const restoreServer = () => {
    container.innerHTML = server.svg;
    restoreAria(server.role);
  };
  liveViews.get(container)?.finalize();
  liveViews.delete(container);
  registerScrubbedSvg();
  let view: View | undefined;
  let started = false;
  try {
    const live = new View(
      parse(hardenVegaSpec(spec), undefined, { ast: true }),
      {
        // `vega-typings` lists only the built-in renderer names.
        renderer: SCRUBBED_SVG as 'svg',
        loader: clientLoader,
        expr: expressionEvaluator,
        hover: true,
      }
    );
    view = live;
    liveViews.set(container, live);
    const drawsPastCap = () =>
      countDrawn((live.scenegraph() as unknown as { root: unknown }).root) >
      MAX_DRAWN_ITEMS;
    // Nothing reaches the host from a view that may yet be rolled back, or whose scales are past what it draws.
    const raise = (event: ChartEvent | undefined) => {
      if (started && event && !drawsPastCap()) {
        onEvent?.(event);
      }
    };
    live.tooltip(new Handler({ formatTooltip }).call);
    if (onEvent && node) {
      const target = node as VegaNode;
      live.addEventListener('click', (_event, item) =>
        raise(
          markSelectEvent(
            target,
            (item as { datum?: unknown } | null | undefined)?.datum
          )
        )
      );
      const brush = node.interactions?.brush;
      if (brush) {
        try {
          live.addSignalListener(brush.signal, (_name, value) =>
            raise(signalBrushEvent(target, value))
          );
        } catch {
          // A spec without the signal raises no brush; the rest of the view stays live.
        }
      }
    }
    container.replaceChildren();
    // Bound inputs go in their own box, outside the chart's image.
    const bindings = document.createElement('div');
    live.initialize(container, bindings);
    container.append(bindings);
    bindings.style.lineHeight = 'normal';
    guardCursor(container);
    const run = await live.runAsync();
    if (liveViews.get(container) !== live) {
      throw new Error('vega: a newer view took the container');
    }
    if (drawsPastCap()) {
      throw new Error('vega: the live view draws past the mark cap');
    }
    if (isScaled(container, server.svg)) {
      throw new Error('vega: the chart is scaled into its box');
    }
    // The bound inputs are reachable only outside an image.
    restoreAria('group');
    started = true;
    watchScale(container, live, () => {
      liveViews.delete(container);
      restoreServer();
    });
    return run;
  } catch (error) {
    view?.finalize();
    if (liveViews.get(container) === view) {
      liveViews.delete(container);
      restoreServer();
    }
    throw error;
  }
};
