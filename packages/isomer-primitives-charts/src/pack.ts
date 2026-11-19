/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  definePrimitivePack,
  type PrimitivePack,
} from '@elastic/isomer-sdk';

import {
  dataTablePrimitive,
  defineDataTablePrimitive,
} from './primitives/data_table';
import { PACK_SCENE_RENDERERS } from './primitives/defaults';
import { defineGaugePrimitive, gaugePrimitive } from './primitives/gauge';
import { gridPrimitive } from './primitives/grid';
import { defineHeatmapPrimitive, heatmapPrimitive } from './primitives/heatmap';
import {
  defineLegacyMetricPrimitive,
  legacyMetricPrimitive,
} from './primitives/legacy_metric';
import { defineMetricPrimitive, metricPrimitive } from './primitives/metric';
import {
  definePartitionChartPrimitive,
  partitionChartPrimitive,
} from './primitives/partition_chart';
import { resolveChart } from './primitives/resolve_chart';
import {
  defineTagCloudPrimitive,
  tagCloudPrimitive,
} from './primitives/tag_cloud';
import { unsupportedPrimitive } from './primitives/unsupported';
import {
  defineXyChartPrimitive,
  xyChartPrimitive,
} from './primitives/xy_chart';
import type {
  ChartFailureHandler,
  ReactSceneRenderer,
  SceneResolver,
} from './render';
import {
  type ChartPrimitiveConfig,
  createChartPrimitiveConfig,
} from './render';
import { chartsDistillery } from './theme';

/** What {@link createChartsPack} builds the pack with. Every field is optional. */
export interface ChartsPackOptions {
  /** Turns a chart node into its Scene. Absent: `resolveChart`. */
  readonly resolveScene?: SceneResolver;
  /**
   * The pack's own renderer preferences, tried after a render's
   * `context.sceneRenderers` and before the pack's fallback. The `snapshot`
   * surface takes no host context, so this is where its preference goes.
   */
  readonly sceneRenderers?: readonly ReactSceneRenderer[];
  /**
   * Told of each chart that could not be resolved or drawn, once for each node
   * a render draws. The
   * chart draws `CHART_FAILURE_TEXT` in its place on every surface.
   */
  readonly onFailure?: ChartFailureHandler;
}

/**
 * The input budget the charts pack declares. Chart nodes carry their data
 * inline, so a dashboard of them passes the SDK's default of 20,000 values
 * long before it is large. Room for about forty panels at a thousand rows of
 * a few columns each.
 */
export const CHARTS_INPUT_BUDGET = {
  values: 250_000,
  characters: 10_000_000,
} as const;

const definePack = (
  primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack =>
  definePrimitivePack({
    id: 'charts',
    slackAssetTypes: [
      'metric',
      'legacyMetric',
      'xyChart',
      'partitionChart',
      'heatmap',
      'gauge',
      'tagCloud',
    ],
    inputBudget: CHARTS_INPUT_BUDGET,
    authoring: {
      groups: [
        {
          title: 'Charts',
          types: [
            'metric',
            'legacyMetric',
            'xyChart',
            'partitionChart',
            'heatmap',
            'gauge',
            'tagCloud',
            'dataTable',
          ],
        },
        { title: 'Dashboards', types: ['grid', 'unsupported'] },
      ],
    },
    primitives,
    distillery: chartsDistillery,
  });

const chartPrimitives = (config: ChartPrimitiveConfig) => [
  defineMetricPrimitive(config),
  defineLegacyMetricPrimitive(config),
  defineDataTablePrimitive(config),
  defineXyChartPrimitive(config),
  definePartitionChartPrimitive(config),
  defineHeatmapPrimitive(config),
  defineGaugePrimitive(config),
  defineTagCloudPrimitive(config),
];

/** The charts pack, drawing every chart through `SceneRenderer`s. */
export const createChartsPack = ({
  resolveScene = resolveChart,
  sceneRenderers = [],
  onFailure,
}: ChartsPackOptions = {}): PrimitivePack =>
  definePack([
    ...chartPrimitives(
      createChartPrimitiveConfig({
        resolveScene,
        sceneRenderers: [...sceneRenderers, ...PACK_SCENE_RENDERERS],
        ...(onFailure && { onFailure }),
      })
    ),
    gridPrimitive,
    unsupportedPrimitive,
  ]);

/**
 * The charts pack with its defaults: `resolveChart`, then the summary
 * fallback. A host registers an engine through {@link createChartsPack} or the
 * render context's `sceneRenderers`.
 */
export const chartsPack: PrimitivePack = definePack([
  metricPrimitive,
  legacyMetricPrimitive,
  dataTablePrimitive,
  xyChartPrimitive,
  partitionChartPrimitive,
  heatmapPrimitive,
  gaugePrimitive,
  tagCloudPrimitive,
  gridPrimitive,
  unsupportedPrimitive,
]);

/** Every rule the pack draws with, for a host that draws the `react` surface and ships the CSS itself. */
export const chartsStylesheet = (): string =>
  chartsDistillery.renderStyles(chartsDistillery.stylesheetCollector());
