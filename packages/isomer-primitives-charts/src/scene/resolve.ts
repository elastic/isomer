/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableNode } from '../schema/data_table';
import type { GaugeNode } from '../schema/gauge';
import type { HeatmapNode } from '../schema/heatmap';
import type { LegacyMetricNode } from '../schema/legacy_metric';
import type { MetricNode } from '../schema/metric';
import type { PartitionChartNode } from '../schema/partition_chart';
import type { TagCloudNode } from '../schema/tag_cloud';
import type { XyChartNode } from '../schema/xy_chart';

import type { ResolveChartOptions } from './common';
import { resolveGauge } from './resolve_gauge';
import { resolveHeatmap } from './resolve_heatmap';
import { resolveLegacyMetric } from './resolve_legacy_metric';
import { resolveMetric } from './resolve_metric';
import { resolvePartition } from './resolve_partition';
import { resolveTable } from './resolve_table';
import { resolveTagCloud } from './resolve_tag_cloud';
import { resolveXy } from './resolve_xy';
import type {
  GaugeScene,
  HeatmapScene,
  LegacyMetricScene,
  MetricScene,
  PartitionScene,
  Scene,
  TableScene,
  TagCloudScene,
  XyScene,
} from './types';

/** A chart node the resolver draws. */
export type ChartNode =
  | MetricNode
  | XyChartNode
  | DataTableNode
  | PartitionChartNode
  | HeatmapNode
  | GaugeNode
  | TagCloudNode
  | LegacyMetricNode;

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
/** Resolves a `gauge` node to a {@link GaugeScene}. */
export function resolveChart(
  node: GaugeNode,
  options: ResolveChartOptions
): GaugeScene;
/** Resolves a `tagCloud` node to a {@link TagCloudScene}. */
export function resolveChart(
  node: TagCloudNode,
  options: ResolveChartOptions
): TagCloudScene;
/** Resolves a `legacyMetric` node to a {@link LegacyMetricScene}. */
export function resolveChart(
  node: LegacyMetricNode,
  options: ResolveChartOptions
): LegacyMetricScene;
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
    case 'gauge':
      return resolveGauge(node, options);
    case 'tagCloud':
      return resolveTagCloud(node, options);
    case 'legacyMetric':
      return resolveLegacyMetric(node, options);
  }
}
