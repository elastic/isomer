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
import { dataTableIcon, metricIcon, xyChartIcon } from './icons';
import { renderSceneNode, type SceneShimConfig } from './scene_node';
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

// An unsafe link is dropped; the chart still draws.
const sanitizeLink = <TNode extends ChartNode>(node: TNode): TNode => {
  const { interactions } = node;
  if (!interactions?.link) {
    return node;
  }
  const { link, ...rest } = interactions;
  const href = sanitizeNavigationHref(link.href);
  return {
    ...node,
    interactions: href === null ? rest : { ...rest, link: { ...link, href } },
  };
};

/** The chart primitives, each drawing through `config`. */
export const defineChartPrimitives = (config: SceneShimConfig) =>
  [
    definePrimitive({
      type: 'metric',
      icon: metricIcon,
      schema: metricSchema,
      catalog: metricCatalog,
      examples: metricExamples,
      sanitize: sanitizeLink,
      renderers: chartRenderers(config),
    }),
    definePrimitive({
      type: 'dataTable',
      icon: dataTableIcon,
      schema: dataTableSchema,
      catalog: dataTableCatalog,
      examples: dataTableExamples,
      sanitize: sanitizeLink,
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
      icon: xyChartIcon,
      schema: xyChartSchema,
      catalog: xyChartCatalog,
      examples: xyChartExamples,
      sanitize: sanitizeLink,
      renderers: chartRenderers(config),
    }),
  ] as const;
