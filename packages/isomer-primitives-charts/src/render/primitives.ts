/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene } from '../scene/types';
import { metricCatalog, xyChartCatalog } from '../schema/catalog';
import { metricExamples } from '../schema/examples/metric';
import { xyChartExamples } from '../schema/examples/xy_chart';
import { metricSchema } from '../schema/metric';
import { xyChartSchema } from '../schema/xy_chart';
import { sceneToMarkdown, sceneToText } from '../text/scene_text';

import type { ChartNode } from './context';
import { definePrimitive } from './define';
import { renderSceneNode, type SceneShimConfig } from './scene_node';

// Surfaces without a render context resolve for the light scheme: their output
// carries text, not colors.
const resolveForText = (node: ChartNode, config: SceneShimConfig): Scene =>
  config.resolveScene(node, { scheme: 'light' });

const chartRenderers = <TNode extends ChartNode>(config: SceneShimConfig) => ({
  react: (node: TNode, env: Parameters<typeof renderSceneNode>[1]) =>
    renderSceneNode(node, env, config),
  text: (node: TNode) => sceneToText(resolveForText(node, config)),
  markdown: (node: TNode) => sceneToMarkdown(resolveForText(node, config)),
});

/** The chart primitives, each drawing through `config`. */
export const defineChartPrimitives = (config: SceneShimConfig) =>
  [
    definePrimitive({
      type: 'metric',
      schema: metricSchema,
      catalog: metricCatalog,
      examples: metricExamples,
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'xyChart',
      schema: xyChartSchema,
      catalog: xyChartCatalog,
      examples: xyChartExamples,
      renderers: chartRenderers(config),
    }),
  ] as const;
