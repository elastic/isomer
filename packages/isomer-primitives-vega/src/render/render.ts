/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartData } from '@elastic/isomer-primitives-charts/schema';
import { logger, parse, renderModule, View, Warn } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';

import { MAX_DRAWN_ITEMS } from '../primitives/vega/schema';
import {
  newReadRecord,
  pruneToReads,
  recordReads,
  replaceMarkers,
  resultMarker,
  type VegaResult,
  withoutTooltips,
  withResults,
} from '../schema';
import {
  hardenBuiltSpec,
  isSpecObject,
  setOwn,
  type SpecObject,
  stripSpec,
} from '../schema';
import { bindTable, type VegaMode } from '../schema';
import { vegaConfig, vegaLiteConfig, type VegaTheme } from '../theme';

import { expressionEvaluator } from './interpreter';
import { inertLoader } from './loader';
import { safeBackground, scrubScene } from './scene';

export type { VegaMode };

/** What a chart needs to draw: the grammar, the spec, its data, and the box it fills. */
export interface VegaChartInput {
  mode: VegaMode;
  spec: SpecObject;
  width: number;
  height: number;
  /** Query results that replace data sources' `url`s, by path. */
  results?: readonly VegaResult[];
  /** The node's typed table, which the spec reads as `table`. */
  data?: ChartData | undefined;
}

/** Vega-Lite views whose size is per cell, not the whole chart. */
const COMPOSITE_KEYS = ['concat', 'hconcat', 'vconcat', 'facet', 'repeat'];

const FIT = { type: 'fit', contains: 'padding' } as const;

/** Kibana fits a Vega spec to its panel unless the spec turns autosize off (`_compileWithAutosize`). */
const autosizeOf = (autosize: unknown) =>
  autosize === 'none' ||
  (typeof autosize === 'object' &&
    autosize !== null &&
    (autosize as { type?: unknown }).type === 'none')
    ? autosize
    : FIT;

/** Objects merge key by key; anything else in `over` replaces `base`. */
const mergeDeep = (base: SpecObject, over: unknown): SpecObject => {
  if (!isSpecObject(over)) {
    return base;
  }
  const result: SpecObject = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = result[key];
    setOwn(
      result,
      key,
      isSpecObject(current) && isSpecObject(value)
        ? mergeDeep(current, value)
        : value
    );
  }
  return result;
};

export interface VegaLog {
  errors: string[];
  warnings: string[];
}

/** A Vega logger that records errors and warnings in `log` instead of printing them. */
const silentLogger = (log: VegaLog = { errors: [], warnings: [] }) =>
  logger(Warn, undefined, (method, _level, input) => {
    // `vega-util` passes the logging call's `arguments` object.
    const message = Array.from(input as ArrayLike<unknown>, String).join(' ');
    (method === 'error' ? log.errors : log.warnings).push(message);
  });

/**
 * The Vega spec a chart renders: stripped of everything that reaches outside
 * it, compiled from Vega-Lite when needed, sized to the node, and themed under
 * the spec's own `config`.
 */
export const toVegaSpec = (
  { mode, spec, width, height, results, data }: VegaChartInput,
  theme: VegaTheme,
  log: VegaLog = { errors: [], warnings: [] }
): SpecObject => {
  const withData = withResults(spec, results);
  const safe = stripSpec(data ? bindTable(mode, withData, data) : withData);
  if (mode === 'vega-lite') {
    const composite = COMPOSITE_KEYS.some((key) => key in safe);
    const sized = composite
      ? safe
      : { ...safe, width, height, autosize: autosizeOf(safe.autosize) };
    const { spec: compiled } = compile(sized as unknown as TopLevelSpec, {
      config: vegaLiteConfig(theme, safe),
      logger: silentLogger(log),
    });
    return hardenBuiltSpec(compiled as unknown as SpecObject);
  }
  return hardenBuiltSpec({
    ...safe,
    width,
    height,
    autosize: autosizeOf(safe.autosize),
    config: mergeDeep(vegaConfig(theme, safe), safe.config),
  });
};

/** A headless view of the spec `json` serializes. */
const viewOfJson = (json: string, log: VegaLog) =>
  new View(
    parse(JSON.parse(json) as SpecObject, undefined, {
      ast: true,
    }),
    {
      renderer: 'none',
      loader: inertLoader,
      expr: expressionEvaluator,
      logger: silentLogger(log),
    }
  );

/**
 * A headless view of a copy of `vegaSpec`, which Vega's parser would otherwise
 * mutate. `ast: true` plus the interpreter: no expression reaches `new Function`.
 */
export const createVegaView = (
  vegaSpec: SpecObject,
  log: VegaLog = { errors: [], warnings: [] }
) => viewOfJson(JSON.stringify(vegaSpec), log);

/** Passes enough for autosize to re-run on the size the first pass measured. */
const MAX_PASSES = 4;

interface Queued {
  callback: (view: View) => void;
  priority: number;
}

/** The dataflow state `settle` reads and the `runAfter` it replaces. */
interface DataflowInternals {
  _pulse: unknown;
  _touched: { length: number };
  runAfter: (
    callback: (view: View) => void,
    enqueue?: boolean,
    priority?: number
  ) => void;
}

/**
 * Runs the dataflow to completion synchronously. Vega awaits each callback
 * queued after a pass, such as autosize's resize, so after the first one the
 * rest run on a later tick. This queues them itself and runs them in Vega's
 * order: by priority, and depth-first, so what a callback queues runs before
 * its next sibling. Then it runs the pass they schedule.
 */
const settle = (view: View, log: VegaLog) => {
  const dataflow = view as unknown as DataflowInternals;
  const queue: Queued[] = [];
  dataflow.runAfter = (callback, enqueue = false, priority = 0) => {
    if (dataflow._pulse !== null || enqueue) {
      queue.push({ callback, priority });
    } else {
      callback(view);
    }
  };
  const drain = () => {
    const ready = queue.splice(0).sort((a, b) => b.priority - a.priority);
    for (const { callback } of ready) {
      try {
        callback(view);
      } catch (error) {
        log.errors.push(String(error));
      }
      drain();
    }
  };
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    view.run();
    drain();
    if (dataflow._touched.length === 0) {
      return;
    }
  }
};

/** Only the headless renderer's surface that this module reads. */
interface HeadlessSvgRenderer {
  initialize(
    el: null,
    width: number,
    height: number,
    origin: readonly [number, number],
    scaleFactor: number
  ): HeadlessSvgRenderer;
  background(color: unknown): HeadlessSvgRenderer;
  render(scene: unknown): HeadlessSvgRenderer;
  svg(): string | null;
}

/** `View` state `toSVG` reads through `vega-view`'s internal `render-size`. */
interface ViewInternals {
  _viewWidth: number;
  _viewHeight: number;
  _origin: [number, number];
}

const svgRenderer = (): HeadlessSvgRenderer => {
  // `vega-typings` declares only the two-argument registration form.
  const lookup = renderModule as unknown as (name: string) => {
    headless: new (loader: unknown) => HeadlessSvgRenderer;
  };
  return new (lookup('svg').headless)(inertLoader);
};

/** Elements the scrub should have made impossible. */
const ESCAPED_ELEMENT =
  /<a[\s>]|<image\b[^>]*href="[^"]|<script|<style|<foreignObject/i;

/** Each tag's span in Vega's markup; Vega escapes `<` and `>` in text and attribute values, so every `<…>` is a tag. */
const tagSpans = (markup: string): Array<[number, number]> => {
  const spans: Array<[number, number]> = [];
  let start = markup.indexOf('<');
  while (start >= 0) {
    const end = markup.indexOf('>', start);
    if (end < 0) {
      break;
    }
    spans.push([start, end + 1]);
    start = markup.indexOf('<', end);
  }
  return spans;
};

/** A tag's attributes, each with its value's span; Vega writes ` name="value"` with `"` escaped in the value. */
const attributesOf = (tag: string) => {
  const attributes: Array<{ name: string; start: number; end: number }> = [];
  let equals = tag.indexOf('="');
  while (equals >= 0) {
    const end = tag.indexOf('"', equals + 2);
    if (end < 0) {
      break;
    }
    const name = tag.slice(tag.lastIndexOf(' ', equals) + 1, equals);
    attributes.push({ name, start: equals + 2, end });
    equals = tag.indexOf('="', end + 1);
  }
  return attributes;
};

/** Text and `aria-*` attributes are prose, so `url(` or a def id there is not a reference. */
const isProse = (name: string) => name.startsWith('aria-');

/** Any `url(` but a reference to the chart's own defs. */
const FETCHING_URL = /url\((?!#)/i;

/** Whether `markup` can link out or fetch. */
const escapes = (markup: string): boolean =>
  ESCAPED_ELEMENT.test(markup) ||
  tagSpans(markup).some(([tagStart, tagEnd]) => {
    const tag = markup.slice(tagStart, tagEnd);
    return attributesOf(tag).some(
      ({ name, start, end }) =>
        !isProse(name) && FETCHING_URL.test(tag.slice(start, end))
    );
  });

/** `markup` with each attribute value passed through `map`, and its text as it is. */
const mapAttributeValues = (
  markup: string,
  map: (name: string, value: string) => string
): string => {
  let out = '';
  let at = 0;
  for (const [tagStart, tagEnd] of tagSpans(markup)) {
    const tag = markup.slice(tagStart, tagEnd);
    let tagAt = 0;
    out += markup.slice(at, tagStart);
    for (const { name, start, end } of attributesOf(tag)) {
      out += tag.slice(tagAt, start) + map(name, tag.slice(start, end));
      tagAt = end;
    }
    out += tag.slice(tagAt);
    at = tagEnd;
  }
  return out + markup.slice(at);
};

/** Ids Vega numbers from process-wide counters: gradients, patterns, and clip paths. */
const DEF_ID = /^(?:p_)?gradient_\d+$|^clip\d+$/;
const DEF_REFERENCE = /url\(#((?:p_)?gradient_\d+|clip\d+)\)/g;

/**
 * `markup` with each def id renumbered from 1 by first use and given `prefix`, in `id` attributes and the
 * attributes that reference one, so a drawing depends neither on Vega's counters nor on another chart's ids.
 */
const scopeDefIds = (markup: string, prefix: string) => {
  const scoped = new Map<string, string>();
  const scope = (id: string) => {
    let next = scoped.get(id);
    if (next === undefined) {
      next = `${prefix}${id.replace(/\d+$/, String(scoped.size + 1))}`;
      scoped.set(id, next);
    }
    return next;
  };
  return mapAttributeValues(markup, (name, value) => {
    if (name === 'id') {
      return DEF_ID.test(value) ? scope(value) : value;
    }
    return isProse(name)
      ? value
      : value.replace(
          DEF_REFERENCE,
          (_match, id: string) => `url(#${scope(id)})`
        );
  });
};

/** A short, stable hash of a spec's JSON, so a chart's def ids depend only on its spec. */
const specHash = (json: string): string => {
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 33 + json.charCodeAt(index)) % 4294967296;
  }
  return hash.toString(36);
};

export class VegaRenderError extends Error {
  override name = 'VegaRenderError';
}

export interface VegaSvg {
  svg: string;
  log: VegaLog;
}

/** Marks whose items draw together as one SVG path. */
const ONE_PATH_MARKS = new Set(['line', 'area', 'trail']);

/** A scene mark, or a group item holding marks. */
interface SceneNode {
  marktype?: string;
  items?: unknown[];
}

/**
 * The SVG elements a scene draws: one per item, but one per line, area and
 * trail, whose items are the vertices of one path. Stops counting past the cap.
 */
const countDrawn = (root: unknown): number => {
  let count = 0;
  const marks: unknown[] = [root];
  while (marks.length > 0 && count <= MAX_DRAWN_ITEMS) {
    const mark = marks.pop() as SceneNode | null;
    const items = Array.isArray(mark?.items) ? mark.items : [];
    if (mark?.marktype !== undefined && ONE_PATH_MARKS.has(mark.marktype)) {
      count += items.length > 0 ? 1 : 0;
      continue;
    }
    count += items.length;
    for (const item of items as Array<SceneNode | null>) {
      if (Array.isArray(item?.items)) {
        marks.push(...item.items);
      }
    }
  }
  return count;
};

/** Runs `view` to completion and draws its scene as an SVG string, scrubbed of anything that fetches, its def ids scoped by `idPrefix`. */
const drawView = (view: View, log: VegaLog, idPrefix: string): string => {
  settle(view, log);
  const [failure] = log.errors;
  if (failure !== undefined) {
    throw new VegaRenderError(`vega: ${failure}`);
  }
  const scene = view.scenegraph() as unknown as { root: unknown };
  const items = countDrawn(scene.root);
  if (items > MAX_DRAWN_ITEMS) {
    throw new VegaRenderError(
      `vega: the chart draws ${items} marks, more than the ${MAX_DRAWN_ITEMS} an image can afford`
    );
  }
  scrubScene(scene.root);
  const internals = view as unknown as ViewInternals;
  const padding = view.padding() as {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  const markup = svgRenderer()
    .initialize(
      null,
      Math.max(0, internals._viewWidth + padding.left + padding.right),
      Math.max(0, internals._viewHeight + padding.top + padding.bottom),
      [padding.left + internals._origin[0], padding.top + internals._origin[1]],
      1
    )
    .background(safeBackground(view.background()))
    .render(scene.root)
    .svg();
  if (!markup) {
    throw new VegaRenderError('vega: the renderer produced no SVG');
  }
  if (escapes(markup)) {
    throw new VegaRenderError(
      'vega: the rendered SVG holds a link, an image source, or a fetching style'
    );
  }
  return scopeDefIds(markup, idPrefix);
};

/** `markup` drawn at `width` × `height`, its drawing scaled into its `viewBox`. */
const sized = (
  markup: string,
  { width, height }: { width: number; height: number }
) =>
  markup.replace(
    /^<svg([^>]*?) width="[^"]*" height="[^"]*"/,
    `<svg$1 width="${width}" height="${height}"`
  );

/**
 * Renders `vegaSpec` to an SVG string synchronously, sized to `width` ×
 * `height` with the drawing scaled into its `viewBox`. Inline data evaluates
 * without awaiting, and {@link inertLoader} gives the renderer nothing to wait
 * for, so this matches `view.toSVG()` without its promise. Def ids are
 * numbered per chart and prefixed with a hash of its spec, so the output is
 * deterministic and two charts in one document never share an id.
 */
export const renderVegaSvg = (
  vegaSpec: SpecObject,
  { width, height }: { width: number; height: number }
): VegaSvg => {
  if (![width, height].every((side) => Number.isFinite(side) && side >= 0)) {
    throw new VegaRenderError(
      `vega: the chart's size, ${width} × ${height}, is not two finite, non-negative numbers`
    );
  }
  const log: VegaLog = { errors: [], warnings: [] };
  const json = JSON.stringify(vegaSpec);
  const idPrefix = `isomer-vega-${specHash(json)}-`;
  // A tooltip only shows on hover, which a static drawing never has.
  const drawn = withoutTooltips(vegaSpec);
  const view = viewOfJson(
    drawn === vegaSpec ? json : JSON.stringify(drawn),
    log
  );
  try {
    return {
      svg: sized(drawView(view, log, idPrefix), { width, height }),
      log,
    };
  } finally {
    view.finalize();
  }
};

/** The SVG without its per-spec def-id prefix, to compare two drawings of one chart. */
const comparable = (svg: string) => svg.replace(/isomer-vega-[a-z0-9]+-/g, '');

/**
 * `input` with each result holding only what its static drawing reads, under every theme given. The drawing runs
 * once with each result behind read-recording proxies, then the pruned input must draw the same SVG as the full
 * one under each theme, or `input` comes back unchanged.
 */
export const pruneVegaResults = <T extends VegaChartInput>(
  input: T,
  themes: readonly VegaTheme[]
): T => {
  const results = input.results ?? [];
  if (results.length === 0 || themes.length === 0) {
    return input;
  }
  const records = results.map(() => newReadRecord());
  const marked = {
    ...input,
    results: results.map((result, index) => ({
      ...result,
      values: resultMarker(index),
    })),
  };
  try {
    // Each recording run draws the full results, so its SVG is the full drawing the pruned one must match.
    const fullSvgs = themes.map((theme) => {
      const log: VegaLog = { errors: [], warnings: [] };
      const compiled = withoutTooltips(toVegaSpec(marked, theme));
      const found = replaceMarkers(compiled, (index) =>
        // A copy: Vega writes into rows as it runs, and the result must stay as the query returned it.
        recordReads(structuredClone(results[index]!.values), records[index]!)
      );
      // A result the compiled spec carries some other way is kept whole.
      records.forEach((record, index) => {
        if (!found.has(index)) {
          record.all = true;
        }
      });
      // Not `createVegaView`: its JSON copy would read everything.
      const view = new View(parse(compiled, undefined, { ast: true }), {
        renderer: 'none',
        loader: inertLoader,
        expr: expressionEvaluator,
        logger: silentLogger(log),
      });
      try {
        return sized(drawView(view, log, ''), input);
      } finally {
        view.finalize();
      }
    });
    const pruned = {
      ...input,
      results: results.map((result, index) => ({
        ...result,
        values: pruneToReads(result.values, records[index]!),
      })),
    };
    const same = themes.every(
      (theme, index) =>
        comparable(renderVegaSvg(toVegaSpec(pruned, theme), input).svg) ===
        fullSvgs[index]
    );
    return same ? pruned : input;
  } catch {
    return input;
  }
};
