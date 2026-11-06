/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack, type PrimitivePack } from '@elastic/isomer-sdk';

import type { ReactSceneRenderer, SceneResolver } from './render/context';
import { gridPrimitive } from './render/grid';
import { defineChartPrimitives } from './render/primitives';
import { summarySceneRenderer } from './render/summary_renderer';
import { tableSceneRenderer } from './render/table';
import { unsupportedPrimitive } from './render/unsupported';
import { resolveChart } from './scene/resolve';

export interface ChartsPackOptions {
  /** Turns a chart node into its Scene. Absent: `resolveChart`. */
  readonly resolveScene?: SceneResolver;
  /**
   * The pack's own renderer preferences, tried after a render's
   * `context.sceneRenderers` and before the pack's fallback. The `snapshot`
   * surface takes no host context, so this is where its preference goes.
   */
  readonly sceneRenderers?: readonly ReactSceneRenderer[];
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
}: ChartsPackOptions = {}): PrimitivePack =>
  definePrimitivePack({
    id: 'charts',
    slackAssetTypes: ['metric', 'xyChart'],
    inputBudget: CHARTS_INPUT_BUDGET,
    authoring: {
      groups: [
        { title: 'Charts', types: ['metric', 'xyChart', 'dataTable'] },
        { title: 'Dashboards', types: ['grid', 'unsupported'] },
      ],
    },
    primitives: [
      ...defineChartPrimitives({
        resolveScene,
        sceneRenderers: [
          ...sceneRenderers,
          tableSceneRenderer,
          summarySceneRenderer,
        ],
      }),
      gridPrimitive,
      unsupportedPrimitive,
    ],
  });

/**
 * The charts pack with its defaults: `resolveChart`, then the summary
 * fallback. A host registers an engine through {@link createChartsPack} or the
 * render context's `sceneRenderers`.
 */
export const chartsPack: PrimitivePack = createChartsPack();
