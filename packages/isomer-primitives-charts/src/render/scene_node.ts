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
  SceneRenderEnv,
} from '../scene/types';
import { toActionEvent } from '../schema/events';

import type {
  ChartNode,
  ChartsReactEnv,
  ReactSceneRenderer,
  SceneResolver,
} from './context';

/** What a pack's shims share: how to resolve, and the renderers after the host's. */
export interface SceneShimConfig {
  readonly resolveScene: SceneResolver;
  /** Tried after the host's `sceneRenderers`. The last should support every kind. */
  readonly sceneRenderers: readonly ReactSceneRenderer[];
}

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

/** The Scene a `react` or `snapshot` render of `node` draws. */
const resolveForReact = (
  node: ChartNode,
  { context, theme }: Pick<ChartsReactEnv, 'context' | 'theme'>,
  config: SceneShimConfig
): Scene =>
  config.resolveScene(node, {
    scheme: context?.scheme ?? schemeOfTheme(theme) ?? 'light',
    ...(context?.size && { size: context.size }),
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
  };
};

/**
 * Draws a chart node through the first renderer that runs here and supports
 * its kind, and throws when none does. Off native, the output sits in one
 * `div` that carries the node anchor; native output is the renderer's own.
 */
export const renderSceneNode = (
  node: ChartNode,
  env: Pick<ChartsReactEnv, 'context' | 'theme'>,
  config: SceneShimConfig
): ReactNode => {
  const { context } = env;
  const scene = resolveForReact(node, env, config);
  const environment = context?.environment ?? detectSceneEnvironment();
  const drawn = pickSceneRenderer(scene, environment, context, config).render(
    scene,
    renderEnv(node, environment, context)
  );
  return environment === 'native'
    ? drawn
    : createElement('div', nodeAnchor(context, node), drawn);
};
