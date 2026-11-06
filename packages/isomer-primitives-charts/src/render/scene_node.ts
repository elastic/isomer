/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every chart primitive's `react` renderer is this shim: resolve the node to a
// Scene, pick a renderer, and hand it the Scene. Nothing here draws.

import { createElement, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { selectSceneRenderer } from '../scene/select';
import type {
  ColorScheme,
  Scene,
  SceneEnvironment,
  SceneSize,
} from '../scene/types';

import type {
  ChartNode,
  ChartsReactEnv,
  ReactSceneRenderer,
  SceneResolver,
} from './context';
import { chartSize, chartSizeSpec, chartSizeStyle } from './size';

/** What a pack's shims share: how to resolve, and the renderers after the host's. */
export interface SceneShimConfig {
  readonly resolveScene: SceneResolver;
  /** Tried after the host's `sceneRenderers`. The last should support every kind. */
  readonly sceneRenderers: readonly ReactSceneRenderer[];
}

/** Where a render is drawing, when the host does not say. */
export const detectSceneEnvironment = (): SceneEnvironment => {
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
export const resolveForReact = (
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

/** The renderer that draws `scene` in this render, if any. */
export const pickSceneRenderer = (
  scene: Scene,
  environment: SceneEnvironment,
  context: ChartsReactEnv['context'],
  config: SceneShimConfig
): ReactSceneRenderer | undefined =>
  selectSceneRenderer(
    [...(context?.sceneRenderers ?? []), ...config.sceneRenderers],
    scene.kind,
    environment
  );

/**
 * Draws a chart node through the first renderer that runs here and supports
 * its kind. Off native, the output sits in one `div` that carries the node
 * anchor; native output is the renderer's own.
 *
 * Without a host `size`, the chart takes its kind's size spec: on Node it
 * resolves for the spec's box, and in a browser the `div` takes the spec's
 * shape, which the renderer fills.
 */
export const renderSceneNode = (
  node: ChartNode,
  env: Pick<ChartsReactEnv, 'context' | 'theme'>,
  config: SceneShimConfig
): ReactNode => {
  const environment = env.context?.environment ?? detectSceneEnvironment();
  const unsized = resolveForReact(node, env, config);
  const spec = env.context?.size ? undefined : chartSizeSpec(unsized);
  const scene =
    spec && environment === 'node'
      ? resolveForReact(node, env, config, chartSize(spec))
      : unsized;
  const renderer = pickSceneRenderer(scene, environment, env.context, config);
  const drawn = renderer
    ? renderer.render(scene, {
        environment,
        ...(node.id !== undefined && { nodeId: node.id }),
      })
    : null;
  return environment === 'native'
    ? drawn
    : createElement(
        'div',
        {
          ...nodeAnchor(env.context, node),
          ...(spec && environment === 'browser'
            ? { style: chartSizeStyle(spec) }
            : {}),
        },
        drawn
      );
};
