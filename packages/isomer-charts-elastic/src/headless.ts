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
import {
  cls,
  px,
  type Scene,
  type SceneEnvironment,
  type SceneKind,
  type SceneRenderer,
  varStyle,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import { EMPTY_LINE_HEIGHT, EMPTY_TEXT_SIZE, emptyTextOf } from './empty';
import { sceneSpecs } from './specs';
import { elasticModule } from './styles';
import { TAG_CLOUD_LABEL } from './tag_cloud_label';
import { kibanaBaseTheme } from './theme';

/** How {@link renderSceneSvg} draws text. */
export interface HeadlessSvgOptions {
  /** Draws text as this font's glyph outlines, so output is the same wherever it is drawn. */
  readonly font?: SvgFont;
  /** Measures text drawn as SVG `<text>`, when there is no `font`. Absent: Elastic Charts' Helvetica metrics. */
  readonly measureTextWidth?: SvgTextWidthMeasure;
}

/** A Scene drawn by {@link renderSceneSvg}: the SVG markup and its box. */
export interface HeadlessSvg {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  /** What `<Chart debugState>` reports, when the Elastic Charts build returns it. */
  readonly debugState?: DebugState;
}

const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Names the SVG by the Scene's `title` and describes it as `Settings` does in a browser. */
const withAccessibleText = (svg: string, scene: Scene): string =>
  svg.replace(
    /^<svg\b[^>]*>/,
    (open) =>
      `${open.slice(0, -1)} role="img">${
        scene.title === undefined
          ? ''
          : `<title>${escapeXml(scene.title)}</title>`
      }<desc>${escapeXml(ariaDescriptionOf(scene))}</desc>`
  );

/** Draws a `metric`, `xy`, `partition`, `heatmap`, `gauge` or `tagCloud` Scene as SVG at the Scene's `size`; an empty one as its note. */
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
  const empty = emptyTextOf(scene);
  // A tag cloud's label takes a line under the cloud, as in a browser.
  const label =
    scene.kind === 'tagCloud' && empty === undefined ? scene.label : undefined;
  const drawn: unknown =
    empty === undefined
      ? renderChart({
          specs: collectSpecs(sceneSpecs(scene, { environment: 'node' })),
          width,
          height:
            label === undefined ? height : height - TAG_CLOUD_LABEL.lineHeight,
          context: canvas.context,
          Path2D: canvas.Path2D,
        })
      : drawEmpty(canvas.context, scene, empty);
  if (label !== undefined) {
    drawLabel(canvas.context, scene, label);
  }
  const debugState = (drawn as { debugState?: DebugState | null } | undefined)
    ?.debugState;
  return {
    svg: withAccessibleText(
      canvas.toSvg({ background: scene.chrome.background }),
      scene
    ),
    width,
    height,
    ...(debugState ? { debugState } : {}),
  };
};

/** `text` in lines no wider than `width` by `measure`, broken between words; a word wider alone keeps its own line. */
const wrapText = (
  text: string,
  width: number,
  measure: (line: string) => number
): string[] => {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && measure(`${last} ${word}`) <= width) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
};

// The note centred in the chart, as Lens's `VisualizationNoResults` draws it,
// wrapped to the chart's width as the browser's note wraps.
const drawEmpty = (
  context: CanvasRenderingContext2D,
  scene: Scene,
  text: string
): undefined => {
  const { width, height } = scene.size!;
  const family = kibanaBaseTheme(scene.scheme).axes.tickLabel.fontFamily;
  context.font = `${EMPTY_TEXT_SIZE}px ${family}`;
  context.fillStyle = scene.chrome.textSubdued;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const lines = wrapText(
    text,
    width,
    (line) => context.measureText(line).width
  );
  const top = height / 2 - ((lines.length - 1) * EMPTY_LINE_HEIGHT) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, top + index * EMPTY_LINE_HEIGHT);
  });
  return undefined;
};

// A tag cloud's label, centred on the line under the cloud in the Scene's
// text color, as the browser draws it.
const drawLabel = (
  context: CanvasRenderingContext2D,
  scene: Scene,
  text: string
): void => {
  const { width, height } = scene.size!;
  const family = kibanaBaseTheme(scene.scheme).axes.tickLabel.fontFamily;
  context.font = `${TAG_CLOUD_LABEL.weight} ${TAG_CLOUD_LABEL.size}px ${family}`;
  context.fillStyle = scene.chrome.text;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height - TAG_CLOUD_LABEL.lineHeight / 2);
};

/** What {@link createElasticChartsHeadlessRenderer} takes: text options and where it runs. */
export interface HeadlessRendererOptions extends HeadlessSvgOptions {
  /**
   * Where the renderer runs. Absent: Node alone. Add `browser` where markup
   * is static, such as a preview of the `html` or `snapshot` surface.
   */
  readonly environments?: readonly SceneEnvironment[];
}

const KINDS: readonly SceneKind[] = [
  'metric',
  'xy',
  'partition',
  'heatmap',
  'gauge',
  'tagCloud',
];

/** A short, stable name for a drawing: the same SVG always gets the same one. */
const drawingScope = (svg: string): string => {
  let hash = 5381;
  for (let index = 0; index < svg.length; index += 1) {
    hash = ((hash * 33) ^ svg.charCodeAt(index)) >>> 0;
  }
  return `ech${hash.toString(36)}`;
};

/**
 * Prefixes every id in an SVG and each reference to one. Elastic Charts names
 * its clip paths `clip0`, `clip1`, …, so two charts inline in one page would
 * otherwise clip with each other's paths. Identical drawings share a prefix,
 * and their paths are identical too.
 */
export const scopeSvgIds = (svg: string, scope: string): string =>
  // Only inside tags, so text such as a label reading `url(#clip0)` stays as drawn.
  svg.replace(/<[^>]+>/g, (tag) =>
    tag
      .replace(/\bid="([^"]+)"/g, `id="${scope}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`)
      .replace(/\bhref="#([^"]+)"/g, `href="#${scope}-$1"`)
  );

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
  render: (scene, env) => {
    const drawn = renderSceneSvg(scene, options);
    const { width, height } = drawn;
    const svg = scopeSvgIds(drawn.svg, drawingScope(drawn.svg));
    const { handles, vars } = elasticModule;
    if (env.environment === 'node') {
      return createElement('div', {
        className: cls(env, handles.drawing),
        style: varStyle(vars.box, { width: px(width), height: px(height) }),
        dangerouslySetInnerHTML: { __html: svg },
      });
    }
    // A browser lays the page out fluidly, so the drawing scales to its
    // container at its own aspect ratio, never past the size it was drawn at.
    return createElement('div', {
      className: cls(env, handles.fluidDrawing),
      style: varStyle(vars.box, {
        maxWidth: px(width),
        aspectRatio: `${width} / ${height}`,
      }),
      dangerouslySetInnerHTML: {
        __html: svg.replace(
          /^<svg\b([^>]*?) width="[^"]*" height="[^"]*"/,
          '<svg$1 width="100%" height="100%"'
        ),
      },
    });
  },
});

export { elasticChartsStylesheet } from './styles';
