/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableNode } from '../schema/data_table';
import type { HeatmapNode } from '../schema/heatmap';
import type { MetricNode } from '../schema/metric';
import type { PartitionChartNode } from '../schema/partition_chart';
import type { XyChartNode } from '../schema/xy_chart';

import type { ResolveChartOptions } from './common';
import { resolveHeatmap } from './resolve_heatmap';
import { resolveMetric } from './resolve_metric';
import { resolvePartition } from './resolve_partition';
import { resolveTable } from './resolve_table';
import { resolveXy } from './resolve_xy';
import type {
  HeatmapScene,
  MetricScene,
  PartitionScene,
  Scene,
  TableScene,
  XyScene,
} from './types';

/** A chart node the resolver draws. */
export type ChartNode =
  MetricNode | XyChartNode | DataTableNode | PartitionChartNode | HeatmapNode;

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
/** Resolves an `xyChart` node to an {@link XyScene}. */
export function resolveChart(
  node: XyChartNode,
  options: ResolveChartOptions
): XyScene;
/** Resolves a `dataTable` node to a {@link TableScene}. */
export function resolveChart(
  node: DataTableNode,
  options: ResolveChartOptions
): TableScene;
/** Resolves a `partitionChart` node to a {@link PartitionScene}. */
export function resolveChart(
  node: PartitionChartNode,
  options: ResolveChartOptions
): PartitionScene;
/** Resolves a `heatmap` node to a {@link HeatmapScene}. */
export function resolveChart(
  node: HeatmapNode,
  options: ResolveChartOptions
): HeatmapScene;
/** Resolves any chart node to its {@link Scene}. */
export function resolveChart(
  node: ChartNode,
  options: ResolveChartOptions
): Scene;
export function resolveChart(
  node: ChartNode,
  options: ResolveChartOptions
): Scene {
  switch (node.type) {
    case 'metric':
      return resolveMetric(node, options);
    case 'xyChart':
      return resolveXy(node, options);
    case 'dataTable':
      return resolveTable(node, options);
    case 'partitionChart':
      return resolvePartition(node, options);
    case 'heatmap':
      return resolveHeatmap(node, options);
  }
}
