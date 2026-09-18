/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The frame an `svg` render is drawn inside, and the geometry that sizes it.
// Frame is a runtime input, not a pack asset: vocabulary is additive, the
// document is exclusive.

import type { ReactNode } from 'react';

import type { RenderTheme } from '../composition/named_color';
import type { PrimitiveNode } from '../composition/node';

/**
 * A frame's palette, per mode. An image has no media queries, so it must
 * commit to one; `auto` resolves light.
 */
export interface ThemePair<TTheme> {
  light: TTheme;
  dark: TTheme;
}

/**
 * Geometry and resolved theme a frame draws within.
 *
 * Named for the viewport rather than the frame because {@link Frame.wrap}
 * draws *a* frame within it; the two would otherwise read as the same thing.
 */
export interface FrameViewport<TTheme> {
  width: number;
  height: number;
  /** Resolved from {@link Frame.theme} for `mode`. */
  theme: TTheme;
  /** What the caller asked for, before resolution. `undefined` and `auto` both resolve light. */
  mode: RenderTheme | undefined;
}

/**
 * The two dispatcher methods a frame needs.
 *
 * The render context the nodes are drawn with is bound by the caller rather
 * than passed here: it carries the class-name resolution that pairs with the
 * stylesheet emitted alongside the frame's output, which is the surface's
 * concern and not the document's. Generic in `TNode` so a helper can be
 * written against a narrowed node union while the runtime holds the erased form.
 */
export interface FrameDispatcher<TNode extends PrimitiveNode = PrimitiveNode> {
  /** Draws one node on the `svg` surface. `key` must be unique among its siblings. */
  renderSvg(node: TNode, key: string): ReactNode;
  /** The node's height in pixels, or `0` when its primitive declares no `metrics.svgHeight`. */
  estimateSvgHeight(node: TNode): number;
}

/**
 * What a frame is told about the composition it draws around.
 *
 * The body is withheld, and {@link bindFrame} copies only these fields into a
 * fresh value: a frame that could read the nodes could branch on a pack's node
 * types, which is the knowledge this split keeps out of it.
 */
export interface FrameHeader {
  title?: string | undefined;
  subtitle?: string | undefined;
  /** The caller's preference, not a resolved palette. Use {@link FrameViewport.theme} to draw. */
  theme?: RenderTheme | undefined;
}

/** {@link FrameHeader} plus the body, for the sizing and validation hooks. */
export interface FrameComposition extends FrameHeader {
  /** Raw nodes, for measuring and checking only. {@link FrameBody} is what gets drawn. */
  body: PrimitiveNode[];
}

/**
 * Body nodes already rendered to elements, ready to be surrounded.
 *
 * Distinct from `Composition.body`, which is the raw {@link PrimitiveNode}
 * array a frame never sees.
 */
export type FrameBody = readonly ReactNode[];

/**
 * A document an `svg` render can produce: its geometry, the surround it draws
 * around the body, and whatever it requires of a composition it is asked to
 * draw.
 *
 * A host registers frames with the runtime and picks one per render. That is
 * what lets one runtime serve a 760px card, a 1920x1080 slide, and a
 * host-branded variant of either from the same vocabulary — and what keeps a
 * vocabulary pack additive, since nothing about a primitive decides the frame.
 * A frame is named by the key a host registers it under, not by a field it
 * carries.
 */
export interface Frame<TTheme> {
  /** Width used when the caller passes none. */
  defaultWidth: number;
  /**
   * Whether {@link Frame.estimateHeight} sums per-node heights, and so
   * under-sizes the frame for a node whose primitive declares no
   * `metrics.svgHeight` — `dispatcher.estimateSvgHeight` returns `0` for those.
   *
   * Defaults to `true`, because the gap is silent and a frame that measures
   * nodes is the normal case. A fixed-size frame sets `false` once and stops
   * the missing `svgHeight` warning reporting a metric nothing reads.
   */
  sizesFromNodeHeights?: boolean;
  /**
   * Palette per mode. Frame and palette vary independently — a branded card is
   * this geometry with a host's colors — so a host overrides one by spreading
   * this value rather than rebuilding anything.
   */
  theme: ThemePair<TTheme>;
  /**
   * Height for this body when the caller passes none, in the geometry this
   * document defines. See {@link Frame.sizesFromNodeHeights} for what it may
   * assume of the nodes.
   */
  estimateHeight(
    composition: FrameComposition,
    dispatcher: FrameDispatcher
  ): number;
  /**
   * What this document requires of a body. A slide document's
   * exactly-one-`slideFrame` rule is the example.
   *
   * Returned rather than thrown so a caller can decide what to do with it, but
   * note where it is *not* checked: composition validation is frame-agnostic,
   * and has to be, because the same composition can be valid in one frame and
   * not another. Only the `svg` surface consults this, on the frame a render
   * actually names, and raises before drawing. A host that wants the answer
   * earlier asks the frame directly.
   */
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
  /**
   * Draws the surround around the already-rendered body nodes, including a
   * title header if this document wants one.
   *
   * Takes the nodes as an array rather than a single `ReactNode` so a frame
   * that draws no surround can return its one root element — image layout
   * starts from a single element, and an array or a fragment is not one.
   *
   * Declared property-style, so it is checked contravariantly in `TTheme` under
   * `strictFunctionTypes`. A method signature is bivariant, which would admit a
   * frame needing a richer theme into a slot typed for a narrower one, where it
   * would read a token nothing supplies.
   */
  wrap: (
    header: FrameHeader,
    body: FrameBody,
    viewport: FrameViewport<TTheme>
  ) => ReactNode;
}

/**
 * A {@link Frame} as the runtime stores it, with its theme resolved away.
 *
 * The erasure is a closure rather than a type parameter because the runtime
 * dispatches nodes through one inventory keyed by node type, which has no
 * single theme to name. A runtime's frames are homogeneous in `TTheme`, so the
 * palette is known where it is resolved and only the resolved result is stored.
 */
export interface BoundFrame {
  readonly defaultWidth: number;
  /** See {@link Frame.sizesFromNodeHeights}; defaulted at binding. */
  readonly sizesFromNodeHeights: boolean;
  /** See {@link Frame.estimateHeight}. */
  estimateHeight(
    composition: FrameComposition,
    dispatcher: FrameDispatcher
  ): number;
  /** See {@link Frame.validateBody}; empty when this frame states no rule. */
  validateBody(body: readonly PrimitiveNode[]): readonly string[];
  /**
   * Resolves {@link Frame.theme} for `mode`, erased to `unknown` like the rest
   * of this type. Lets a caller hand the palette to a primitive's `env.theme`
   * without itself knowing `TTheme`.
   */
  resolveTheme(mode: RenderTheme | undefined): unknown;
  /** Renders the body and its surround at `viewport`'s geometry. */
  render(
    composition: FrameComposition,
    viewport: { width: number; height: number; mode: RenderTheme | undefined },
    dispatcher: FrameDispatcher
  ): ReactNode;
  /** One node, no surround. */
  renderNode(node: PrimitiveNode, dispatcher: FrameDispatcher): ReactNode;
}

/**
 * Erases a {@link Frame}'s `TTheme` into a {@link BoundFrame}, resolving the
 * palette per render and composing the generic body walk with the frame's own
 * surround.
 */
export const bindFrame = <TTheme>(frame: Frame<TTheme>): BoundFrame => {
  const themeFor = (mode: RenderTheme | undefined): TTheme =>
    mode === 'dark' ? frame.theme.dark : frame.theme.light;
  return {
    defaultWidth: frame.defaultWidth,
    sizesFromNodeHeights: frame.sizesFromNodeHeights ?? true,
    estimateHeight: (composition, dispatcher) =>
      frame.estimateHeight(composition, dispatcher),
    validateBody: (body) => frame.validateBody?.(body) ?? [],
    resolveTheme: (mode) => themeFor(mode),
    render: (composition, viewport, dispatcher) => {
      const theme = themeFor(viewport.mode);
      const { title, subtitle, theme: mode } = composition;
      return frame.wrap(
        { title, subtitle, theme: mode },
        composition.body.map((node, index) =>
          dispatcher.renderSvg(node, `body-${index}`)
        ),
        { ...viewport, theme }
      );
    },
    renderNode: (node, dispatcher) => dispatcher.renderSvg(node, node.type),
  };
};
