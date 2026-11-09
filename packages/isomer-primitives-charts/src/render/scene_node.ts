/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every chart primitive's `react` renderer is this shim: resolve the node to a
// Scene, pick a renderer, and hand it the Scene. The chart's link is the one
// thing drawn here.

import { createElement, type ReactNode } from 'react';
import { nodeAnchor, sanitizeNavigationHref } from '@elastic/isomer-sdk';

import { selectSceneRenderer } from '../scene/select';
import type {
  ColorScheme,
  Scene,
  SceneEnvironment,
  SceneRenderEnv,
  SceneSize,
} from '../scene/types';
import { toActionEvent } from '../schema/events';

import type {
  ChartNode,
  ChartsReactEnv,
  ReactSceneRenderer,
  SceneResolver,
} from './context';
import { chartSize, chartSizeSpec, chartSizeStyle } from './size';
import { tableHeight } from './table';
import { CHARTS_THEME } from './theme';

/** What a pack's shims share: how to resolve, and the renderers after the host's. */
export interface SceneShimConfig {
  readonly resolveScene: SceneResolver;
  /** Tried after the host's `sceneRenderers`. The last should support every kind. */
  readonly sceneRenderers: readonly ReactSceneRenderer[];
}

const { linkHeight } = CHARTS_THEME.chart;

/** A Scene's link, when its `href` passes the SDK's navigation policy. */
const sceneLink = ({
  interactions: { link },
}: Scene): { readonly href: string; readonly label: string } | undefined => {
  const href = link && sanitizeNavigationHref(link.href);
  return link && href ? { href, label: link.label } : undefined;
};

/** The height a Scene's link line takes below the chart. */
export const linkLineHeight = (scene: Scene): number =>
  sceneLink(scene) ? linkHeight : 0;

/** Where a render is drawing, when the host does not say. */
const detectSceneEnvironment = (): SceneEnvironment => {
  if (
    typeof navigator !== 'undefined' &&
    (navigator as { product?: string }).product === 'ReactNative'
  ) {
    return 'native';
  }
  return typeof document === 'undefined' ? 'node' : 'browser';
};

const schemeOfTheme = (theme: unknown): ColorScheme | undefined => {
  if (typeof theme !== 'object' || theme === null || !('scheme' in theme)) {
    return undefined;
  }
  const { scheme } = theme;
  return scheme === 'light' || scheme === 'dark' ? scheme : undefined;
};

/** The Scene a `react` or `snapshot` render of `node` draws, at `size` or the host's. */
const resolveForReact = (
  node: ChartNode,
  { context, theme }: Pick<ChartsReactEnv, 'context' | 'theme'>,
  config: SceneShimConfig,
  size: SceneSize | undefined = context?.size
): Scene =>
  config.resolveScene(node, {
    scheme: context?.scheme ?? schemeOfTheme(theme) ?? 'light',
    ...(size && { size }),
    ...(context?.locale && { locale: context.locale }),
    ...(context?.timeZone && { timeZone: context.timeZone }),
  });

const pickSceneRenderer = (
  scene: Scene,
  environment: SceneEnvironment,
  context: ChartsReactEnv['context'],
  config: SceneShimConfig
): ReactSceneRenderer => {
  const renderer = selectSceneRenderer(
    [...(context?.sceneRenderers ?? []), ...config.sceneRenderers],
    scene.kind,
    environment
  );
  if (!renderer) {
    throw new Error(
      `charts pack: no SceneRenderer draws "${scene.kind}" Scenes on ${environment}; pass one in \`context.sceneRenderers\` or \`createChartsPack({ sceneRenderers })\``
    );
  }
  return renderer;
};

const renderEnv = (
  node: ChartNode,
  environment: SceneEnvironment,
  context: ChartsReactEnv['context']
): SceneRenderEnv => {
  return {
    environment,
    ...(node.id !== undefined && { nodeId: node.id }),
    ...(context?.onEvent && {
      onEvent: (event) => context.onEvent?.(toActionEvent(event)),
    }),
    ...(context?.resolveClassName && {
      resolveClassName: context.resolveClassName,
    }),
  };
};

/** The box a chart resolves for without a host size; none where its container sizes it. */
const fixedBox = (
  scene: Scene,
  environment: SceneEnvironment,
  { sized }: ReactSceneRenderer
): SceneSize | undefined => {
  if (sized === true && scene.kind === 'table') {
    return { width: CHARTS_THEME.chart.width, height: tableHeight(scene) };
  }
  const spec = chartSizeSpec(scene);
  return spec && (environment === 'node' || sized === true)
    ? chartSize(spec)
    : undefined;
};

/**
 * Draws a chart node through the first renderer that runs here and supports
 * its kind, and throws when none does. Off native, the output sits in one
 * `div` that carries the node anchor, with the Scene's link on a line below
 * it; native output is the renderer's own.
 *
 * Without a host `size`, the chart takes its kind's size spec. On Node, or
 * for a `sized` renderer, it resolves for the spec's box; in a browser, a
 * `fluid` renderer's box takes the spec's shape and the renderer fills it.
 * A host `size` holds the link line too.
 */
export const renderSceneNode = (
  node: ChartNode,
  env: ChartsReactEnv,
  config: SceneShimConfig
): ReactNode => {
  const { context } = env;
  const environment = context?.environment ?? detectSceneEnvironment();
  const unsized = resolveForReact(node, env, config);
  const renderer = pickSceneRenderer(unsized, environment, context, config);
  const link = environment === 'native' ? undefined : sceneLink(unsized);
  const box = context?.size
    ? link && {
        width: context.size.width,
        height: Math.max(0, context.size.height - linkHeight),
      }
    : fixedBox(unsized, environment, renderer);
  const scene = box ? resolveForReact(node, env, config, box) : unsized;
  const spec =
    !context?.size && !box && environment === 'browser' && renderer.fluid
      ? chartSizeSpec(unsized)
      : undefined;
  const drawn = renderer.render(scene, renderEnv(node, environment, context));
  if (environment === 'native') {
    return drawn;
  }
  const style = spec && chartSizeStyle(spec);
  if (!link) {
    return createElement(
      'div',
      { ...nodeAnchor(context, node), ...(style && { style }) },
      drawn
    );
  }
  return createElement(
    'div',
    nodeAnchor(context, node),
    createElement('div', style && { style }, drawn),
    createElement(
      'a',
      {
        href: link.href,
        title: link.label,
        style: {
          display: 'block',
          height: linkHeight,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          color: unsized.chrome.text,
          background: unsized.chrome.background,
          fontSize: CHARTS_THEME.type.body,
          lineHeight: `${linkHeight}px`,
        },
      },
      link.label
    )
  );
};
