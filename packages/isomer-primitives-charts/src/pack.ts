/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack, type PrimitivePack } from '@elastic/isomer-sdk';

import type {
  ChartNode,
  ReactSceneRenderer,
  SceneResolver,
} from './render/context';
import { gridPrimitive } from './render/grid';
import { defineChartPrimitives } from './render/primitives';
import { chartsDistillery, chartsStyleAdapter } from './render/styles';
import { summarySceneRenderer } from './render/summary_renderer';
import { unsupportedPrimitive } from './render/unsupported';

/** What {@link createChartsPack} builds the pack with. Every field is optional. */
export interface ChartsPackOptions {
  /** Turns a chart node into its Scene. */
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

const noResolver: SceneResolver = (node: ChartNode) => {
  throw new Error(
    `charts pack: cannot draw "${node.type}" without a Scene resolver; pass \`resolveScene\` to createChartsPack`
  );
};

/** The charts pack, drawing every chart through `SceneRenderer`s. */
export const createChartsPack = ({
  resolveScene = noResolver,
  sceneRenderers = [],
}: ChartsPackOptions = {}): PrimitivePack =>
  definePrimitivePack({
    id: 'charts',
    slackAssetTypes: ['metric', 'xyChart'],
    inputBudget: CHARTS_INPUT_BUDGET,
    primitives: [
      ...defineChartPrimitives({
        resolveScene,
        sceneRenderers: [...sceneRenderers, summarySceneRenderer],
      }),
      gridPrimitive,
      unsupportedPrimitive,
    ],
    styleAdapter: chartsStyleAdapter,
  });

/**
 * The charts pack with its defaults. It validates every node; drawing a chart
 * node needs a `resolveScene`, given through {@link createChartsPack}.
 */
export const chartsPack: PrimitivePack = createChartsPack();

/** Every rule the pack draws with, for a host that draws the `react` surface and ships the CSS itself. */
export const chartsStylesheet = (): string =>
  chartsDistillery.renderStyles(chartsDistillery.stylesheetCollector());
