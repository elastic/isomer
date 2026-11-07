/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode } from '../schema/metric';
import type { XyChartNode } from '../schema/xy_chart';

import type { ResolveChartOptions } from './common';
import { resolveMetric } from './resolve_metric';
import { resolveXy } from './resolve_xy';
import type { MetricScene, Scene, XyScene } from './types';

/** A chart node the resolver draws. */
export type ChartNode = MetricNode | XyChartNode;

/**
 * Resolves a chart node to the Scene every renderer draws: colors for
 * `options.scheme`, every string formatted, axis and series intent, and the
 * rows and columns each selectable part stands for. Pure and synchronous; the
 * result is plain JSON data.
 */
export function resolveChart(
  node: MetricNode,
  options: ResolveChartOptions
): MetricScene;
export function resolveChart(
  node: XyChartNode,
  options: ResolveChartOptions
): XyScene;
export function resolveChart(
  node: ChartNode,
  options: ResolveChartOptions
): Scene;
export function resolveChart(
  node: ChartNode,
  options: ResolveChartOptions
): Scene {
  return node.type === 'metric'
    ? resolveMetric(node, options)
    : resolveXy(node, options);
}
