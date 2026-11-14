/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack, type PrimitivePack } from '@elastic/isomer-sdk';

import type { ReactSceneRenderer, SceneResolver } from './render/context';
import type { ChartFailureHandler } from './render/failure';
import { gridPrimitive } from './render/grid';
import { legacyMetricSceneRenderer } from './render/legacy_metric';
import { defineChartPrimitives } from './render/primitives';
import { chartsDistillery, chartsStyleAdapter } from './render/styles';
import { summarySceneRenderer } from './render/summary_renderer';
import { tableSceneRenderer } from './render/table';
import { unsupportedPrimitive } from './render/unsupported';
import { resolveChart } from './scene/resolve';

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

/** The charts pack, drawing every chart through `SceneRenderer`s. */
export const createChartsPack = ({
  resolveScene = resolveChart,
  sceneRenderers = [],
  onFailure,
}: ChartsPackOptions = {}): PrimitivePack =>
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
    primitives: [
      ...defineChartPrimitives({
        resolveScene,
        sceneRenderers: [
          ...sceneRenderers,
          tableSceneRenderer,
          legacyMetricSceneRenderer,
          summarySceneRenderer,
        ],
        ...(onFailure && { onFailure }),
      }),
      gridPrimitive,
      unsupportedPrimitive,
    ],
    styleAdapter: chartsStyleAdapter,
  });

/**
 * The charts pack with its defaults: `resolveChart`, then the summary
 * fallback. A host registers an engine through {@link createChartsPack} or the
 * render context's `sceneRenderers`.
 */
export const chartsPack: PrimitivePack = createChartsPack();

/** Every rule the pack draws with, for a host that draws the `react` surface and ships the CSS itself. */
export const chartsStylesheet = (): string =>
  chartsDistillery.renderStyles(chartsDistillery.stylesheetCollector());
