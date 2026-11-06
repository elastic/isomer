/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene, TableScene } from '../scene/types';
import {
  dataTableCatalog,
  metricCatalog,
  xyChartCatalog,
} from '../schema/catalog';
import { type DataTableNode, dataTableSchema } from '../schema/data_table';
import { dataTableExamples } from '../schema/examples/data_table';
import { metricExamples } from '../schema/examples/metric';
import { xyChartExamples } from '../schema/examples/xy_chart';
import { metricSchema } from '../schema/metric';
import { xyChartSchema } from '../schema/xy_chart';
import { sceneToMarkdown, sceneToText } from '../text/scene_text';
import { tableSceneToSlack } from '../text/slack_table';

import type { ChartNode } from './context';
import { definePrimitive } from './define';
import { renderSceneNode, type SceneShimConfig } from './scene_node';
import { chartSize, chartSizeSpec } from './size';
import { tableHeight } from './table';

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

/** A chart's `snapshot` height: its size spec's box on Node, which is where `snapshot` draws. */
const snapshotHeight =
  (config: SceneShimConfig) =>
  (node: ChartNode): number => {
    const spec = chartSizeSpec(resolveForText(node, config));
    return spec ? chartSize(spec).height : 0;
  };

/** The chart primitives, each drawing through `config`. */
export const defineChartPrimitives = (config: SceneShimConfig) =>
  [
    definePrimitive({
      type: 'metric',
      schema: metricSchema,
      catalog: metricCatalog,
      examples: metricExamples,
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'dataTable',
      schema: dataTableSchema,
      catalog: dataTableCatalog,
      examples: dataTableExamples,
      metrics: {
        snapshotHeight: (node: DataTableNode) =>
          tableHeight(resolveForText(node, config) as TableScene),
      },
      renderers: {
        ...chartRenderers<DataTableNode>(config),
        slack: (node: DataTableNode, { baseUrl }: { baseUrl?: string }) =>
          tableSceneToSlack(
            resolveForText(node, config) as TableScene,
            baseUrl
          ),
      },
    }),
    definePrimitive({
      type: 'xyChart',
      schema: xyChartSchema,
      catalog: xyChartCatalog,
      examples: xyChartExamples,
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
  ] as const;
