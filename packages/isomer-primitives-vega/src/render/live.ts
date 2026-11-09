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
import { Handler } from 'vega-tooltip';

import { markSelectEvent, signalBrushEvent } from '../events';
import type { VegaNode } from '../schema/node';
import { hardenVegaSpec, type SpecObject } from '../schema/spec';

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
 * once the first render is done; finalize the view to remove it.
 */
export const startLiveView = (
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
  view.tooltip(new Handler().call);
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
  container.replaceChildren();
  return view.initialize(container).runAsync();
};
