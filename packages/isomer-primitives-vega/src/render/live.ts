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
import type { VegaNode } from '../primitives/vega/schema';
import { hardenVegaSpec, type SpecObject } from '../schema';

import { expressionEvaluator } from './interpreter';
import { safeBackground, scrubScene } from './scene';

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
 * before every draw: signals and data re-set links and styles on each update.
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

/** Keeps the cursor to a keyword, as the spec walk does: a `cursor` signal can still yield a `url(...)`. */
const guardCursor = (element: HTMLElement) => {
  const { style } = element;
  const native = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(style) as object,
    'cursor'
  );
  if (!native?.get || !native.set) {
    return;
  }
  const accessors: PropertyDescriptor = native;
  Object.defineProperty(style, 'cursor', {
    configurable: true,
    get: () => accessors.get?.call(style) as string,
    set: (value: unknown) =>
      accessors.set?.call(
        style,
        typeof value === 'string' && /^[a-z-]+$/i.test(value) ? value : ''
      ),
  });
};

/** The size the server drew the chart at, which its `viewBox` scales into. */
const drawnSize = (container: HTMLElement) => {
  const svg = container.querySelector('svg');
  const width = Number(svg?.getAttribute('width'));
  const height = Number(svg?.getAttribute('height'));
  return width > 0 && height > 0 ? { width, height } : undefined;
};

/** What a live view raises events for: the node's `id`, `data` and `interactions`. */
export type LiveVegaNode = Pick<VegaNode, 'id' | 'data' | 'interactions'>;

export interface LiveViewOptions {
  /** Raises each chart event the node offers. Absent: the view raises none. */
  readonly onEvent?: (event: ChartEvent) => void;
  readonly node?: LiveVegaNode;
}

/**
 * Draws `spec` into `container` as a live view, replacing what it holds, and
 * wires the node's `mark` selection and brush signal to `onEvent`. Resolves
 * once the first render is done; finalize the view to remove it. On failure the
 * view is finalized and `container` gets its markup back.
 */
export const startLiveView = async (
  container: HTMLElement,
  spec: SpecObject,
  { onEvent, node }: LiveViewOptions = {}
): Promise<View> => {
  registerScrubbedSvg();
  const view = new View(parse(hardenVegaSpec(spec), undefined, { ast: true }), {
    // `vega-typings` lists only the built-in renderer names.
    renderer: SCRUBBED_SVG as 'svg',
    loader: clientLoader,
    expr: expressionEvaluator,
    hover: true,
  });
  view.tooltip(new Handler({ formatTooltip }).call);
  if (onEvent && node) {
    const target = node as VegaNode;
    view.addEventListener('click', (_event, item) => {
      const event = markSelectEvent(
        target,
        (item as { datum?: unknown } | null | undefined)?.datum
      );
      if (event) {
        onEvent(event);
      }
    });
    const brush = node.interactions?.brush;
    if (brush) {
      view.addSignalListener(brush.signal, (_name, value) => {
        const event = signalBrushEvent(target, value);
        if (event) {
          onEvent(event);
        }
      });
    }
  }
  const markup = Array.from(container.childNodes);
  const size = drawnSize(container);
  container.replaceChildren();
  // Bound inputs go in their own box: the chart's is an image to assistive technology.
  const bindings = document.createElement('div');
  view.initialize(container, bindings);
  container.append(bindings);
  bindings.style.lineHeight = 'normal';
  guardCursor(container);
  const drawn = Array.from(container.childNodes);
  try {
    const run = await view.runAsync();
    // The inputs are reachable only outside an image.
    container.setAttribute('role', 'group');
    const svg = container.querySelector('svg');
    if (svg && size) {
      svg.style.width = `${size.width}px`;
      svg.style.height = `${size.height}px`;
    }
    return run;
  } catch (error) {
    view.finalize();
    // The server's markup comes back unless a newer view has taken the container.
    if (drawn.every((child) => child.parentNode === container)) {
      container.replaceChildren(...markup);
    }
    throw error;
  }
};
