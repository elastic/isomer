/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

import type { Scene, TableScene } from '../scene/types';
import {
  dataTableCatalog,
  gaugeCatalog,
  heatmapCatalog,
  metricCatalog,
  partitionChartCatalog,
  tagCloudCatalog,
  xyChartCatalog,
} from '../schema/catalog';
import { type DataTableNode, dataTableSchema } from '../schema/data_table';
import { dataTableExamples } from '../schema/examples/data_table';
import { gaugeExamples } from '../schema/examples/gauge';
import { heatmapExamples } from '../schema/examples/heatmap';
import { metricExamples } from '../schema/examples/metric';
import { partitionChartExamples } from '../schema/examples/partition_chart';
import { tagCloudExamples } from '../schema/examples/tag_cloud';
import { xyChartExamples } from '../schema/examples/xy_chart';
import { gaugeSchema } from '../schema/gauge';
import { heatmapSchema } from '../schema/heatmap';
import { metricSchema } from '../schema/metric';
import { partitionChartSchema } from '../schema/partition_chart';
import { tagCloudSchema } from '../schema/tag_cloud';
import { xyChartSchema } from '../schema/xy_chart';
import { sceneToMarkdown, sceneToText } from '../text/scene_text';
import { tableSceneToSlack } from '../text/slack_table';

import type { ChartNode } from './context';
import { definePrimitive } from './define';
import {
  dataTableIcon,
  gaugeIcon,
  heatmapIcon,
  metricIcon,
  partitionChartIcon,
  tagCloudIcon,
  xyChartIcon,
} from './icons';
import { createSceneCache } from './scene_cache';
import {
  linkLineHeight,
  renderSceneNode,
  type SceneShim,
  type SceneShimConfig,
} from './scene_node';
import { chartSize, chartSizeSpec } from './size';
import { tableHeight } from './table';

// Surfaces without a render context resolve for the light scheme: their output
// carries text, not colors.
const resolveForText = (node: ChartNode, config: SceneShim): Scene =>
  config.cache.resolve(node, { scheme: 'light' }, config.resolveScene);

const chartRenderers = <TNode extends ChartNode>(config: SceneShim) => ({
  react: (node: TNode, env: Parameters<typeof renderSceneNode>[1]) =>
    renderSceneNode(node, env, config),
  text: (node: TNode) => sceneToText(resolveForText(node, config)),
  markdown: (node: TNode) => sceneToMarkdown(resolveForText(node, config)),
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
  (node: ChartNode): number => {
    const scene = resolveForText(node, config);
    const spec = chartSizeSpec(scene);
    return (spec ? chartSize(spec).height : 0) + linkLineHeight(scene);
  };

/** The chart primitives, each drawing through `shimConfig`, resolving and drawing each node once per render. */
export const defineChartPrimitives = (shimConfig: SceneShimConfig) => {
  const config: SceneShim = { ...shimConfig, cache: createSceneCache() };
  return [
    definePrimitive({
      type: 'metric',
      icon: metricIcon,
      schema: metricSchema,
      catalog: metricCatalog,
      examples: metricExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'dataTable',
      icon: dataTableIcon,
      schema: dataTableSchema,
      catalog: dataTableCatalog,
      examples: dataTableExamples,
      sanitize: sanitizeLink(config),
      metrics: {
        snapshotHeight: (node: DataTableNode) => {
          const scene = resolveForText(node, config) as TableScene;
          return tableHeight(scene) + linkLineHeight(scene);
        },
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
      icon: xyChartIcon,
      schema: xyChartSchema,
      catalog: xyChartCatalog,
      examples: xyChartExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'partitionChart',
      icon: partitionChartIcon,
      schema: partitionChartSchema,
      catalog: partitionChartCatalog,
      examples: partitionChartExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'heatmap',
      icon: heatmapIcon,
      schema: heatmapSchema,
      catalog: heatmapCatalog,
      examples: heatmapExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'gauge',
      icon: gaugeIcon,
      schema: gaugeSchema,
      catalog: gaugeCatalog,
      examples: gaugeExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'tagCloud',
      icon: tagCloudIcon,
      schema: tagCloudSchema,
      catalog: tagCloudCatalog,
      examples: tagCloudExamples,
      sanitize: sanitizeLink(config),
      metrics: { snapshotHeight: snapshotHeight(config) },
      renderers: chartRenderers(config),
    }),
  ] as const;
};
