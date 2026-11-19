/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import type { Scene } from '../scene';
import { sceneToMarkdown, sceneToText } from '../text';

import type { ChartNode, ChartsReactEnv } from './context';
import { createFailureGuard, FAILURE_HEIGHT, failureText } from './failure';
import { createSceneCache } from './scene_cache';
import {
  linkLineHeight,
  renderSceneNode,
  type SceneShim,
  type SceneShimConfig,
} from './scene_node';
import { chartSize, chartSizeSpec } from './size';

export type { SceneShim as ChartPrimitiveConfig } from './scene_node';

/** `shimConfig` with the scene cache and failure guard one pack's chart primitives share. */
export const createChartPrimitiveConfig = (
  shimConfig: SceneShimConfig
): SceneShim => ({
  ...shimConfig,
  cache: createSceneCache(),
  guard: createFailureGuard(shimConfig.onFailure),
});

// Surfaces without a render context resolve for the light scheme: their output
// carries text, not colors.
export const resolveForText = (node: ChartNode, config: SceneShim): Scene =>
  config.cache.resolve(node, { scheme: 'light' }, config.resolveScene);

const chartRenderers = <TNode extends ChartNode>(config: SceneShim) => ({
  react: (node: TNode, env: ChartsReactEnv) =>
    renderSceneNode(node, env, config),
  text: (node: TNode) =>
    config.guard(
      node,
      () => sceneToText(resolveForText(node, config)),
      () => failureText(node)
    ),
  markdown: (node: TNode) =>
    config.guard(
      node,
      () => sceneToMarkdown(resolveForText(node, config)),
      () => [md.paragraph(failureText(node))]
    ),
});

// An unsafe link is dropped; the chart still draws. A safe link keeps the
// node, and the dispatcher's repeated calls share one copy, so each pass of a
// render reads the same node and its cached Scene.
const sanitizeLink =
  (config: SceneShim) =>
  <TNode extends ChartNode>(node: TNode): TNode => {
    const { interactions } = node;
    if (!interactions?.link) {
      return node;
    }
    const { link, ...rest } = interactions;
    const href = sanitizeNavigationHref(link.href);
    if (href === link.href) {
      return node;
    }
    return config.cache.share(node, () => ({
      ...node,
      interactions: href === null ? rest : { ...rest, link: { ...link, href } },
    }));
  };

/** A chart's `snapshot` height: its size spec's box on Node, which is where `snapshot` draws, and its link line. */
const snapshotHeight =
  (config: SceneShim) =>
  (node: ChartNode): number =>
    config.guard(
      node,
      () => {
        const scene = resolveForText(node, config);
        const spec = chartSizeSpec(scene);
        return (spec ? chartSize(spec).height : 0) + linkLineHeight(scene);
      },
      () => FAILURE_HEIGHT
    );

/** The `sanitize`, `metrics` and `renderers` every chart primitive's definition spreads, drawing through `config`. */
export const chartPrimitiveParts = <TNode extends ChartNode>(
  config: SceneShim
) => ({
  sanitize: sanitizeLink(config),
  metrics: { snapshotHeight: snapshotHeight(config) },
  renderers: chartRenderers<TNode>(config),
});
