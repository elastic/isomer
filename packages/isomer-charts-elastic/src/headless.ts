/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A Scene drawn to SVG by Elastic Charts' headless renderer
// (elastic/elastic-charts#2939), from the same spec builder `<Chart>` uses.
// No DOM, no worker and no native canvas: the SVG goes inline into `snapshot`
// markup, and takumi rasterizes it.

import { createElement, type ReactNode } from 'react';
import type { DebugState } from '@elastic/charts';
import {
  collectSpecs,
  renderChart,
  SvgCanvas,
  type SvgFont,
  type SvgTextWidthMeasure,
} from '@elastic/charts/dist/headless';
import type {
  Scene,
  SceneEnvironment,
  SceneKind,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';

import { sceneSpecs } from './specs';

export interface HeadlessSvgOptions {
  /** Draws text as this font's glyph outlines, so output is the same wherever it is drawn. */
  readonly font?: SvgFont;
  /** Measures text drawn as SVG `<text>`, when there is no `font`. Absent: Elastic Charts' Helvetica metrics. */
  readonly measureTextWidth?: SvgTextWidthMeasure;
}

export interface HeadlessSvg {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  /** What `<Chart debugState>` reports, when the Elastic Charts build returns it. */
  readonly debugState?: DebugState;
}

/** Draws a `metric` or `xy` Scene as SVG at the Scene's `size`. */
export const renderSceneSvg = (
  scene: Scene,
  { font, measureTextWidth }: HeadlessSvgOptions = {}
): HeadlessSvg => {
  if (!scene.size) {
    throw new Error(
      `isomer-charts-elastic: a headless ${scene.kind} Scene needs a size; resolve it with one`
    );
  }
  const { width, height } = scene.size;
  const canvas = new SvgCanvas(width, height, {
    ...(font ? { font } : {}),
    ...(measureTextWidth ? { measureTextWidth } : {}),
  });
  const drawn: unknown = renderChart({
    specs: collectSpecs(sceneSpecs(scene, { environment: 'node' })),
    width,
    height,
    context: canvas.context,
    Path2D: canvas.Path2D,
  });
  const debugState = (drawn as { debugState?: DebugState | null } | undefined)
    ?.debugState;
  return {
    svg: canvas.toSvg({ background: scene.chrome.background }),
    width,
    height,
    ...(debugState ? { debugState } : {}),
  };
};

export interface HeadlessRendererOptions extends HeadlessSvgOptions {
  /**
   * Where the renderer runs. Absent: Node alone. Add `browser` where markup
   * is static, such as a preview of the `html` or `snapshot` surface.
   */
  readonly environments?: readonly SceneEnvironment[];
}

const KINDS: readonly SceneKind[] = ['metric', 'xy'];

/**
 * A `SceneRenderer` drawing the chart's SVG inline in a `div`, so static
 * markup, such as the `snapshot` surface's, carries it to takumi. It is
 * `sized`: every Scene it draws carries a size. Register it in the charts
 * pack's `sceneRenderers`, since `snapshot` takes no host context.
 */
export const createElasticChartsHeadlessRenderer = ({
  environments = ['node'],
  ...options
}: HeadlessRendererOptions = {}): SceneRenderer<ReactNode> => ({
  id: 'elastic-charts-headless',
  environments,
  sized: true,
  supports: (kind) => KINDS.includes(kind),
  render: (scene) => {
    const { svg, width, height } = renderSceneSvg(scene, options);
    return createElement('div', {
      style: { display: 'flex', width, height },
      dangerouslySetInnerHTML: { __html: svg },
    });
  },
});
