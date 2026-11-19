/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTable } from '../primitives/data_table/resolve';
import type { TableScene } from '../primitives/data_table/scene';
import type { DataTableNode } from '../primitives/data_table/schema';
import { resolveGauge } from '../primitives/gauge/resolve';
import type { GaugeScene } from '../primitives/gauge/scene';
import type { GaugeNode } from '../primitives/gauge/schema';
import { resolveHeatmap } from '../primitives/heatmap/resolve';
import type { HeatmapScene } from '../primitives/heatmap/scene';
import type { HeatmapNode } from '../primitives/heatmap/schema';
import { resolveLegacyMetric } from '../primitives/legacy_metric/resolve';
import type { LegacyMetricScene } from '../primitives/legacy_metric/scene';
import type { LegacyMetricNode } from '../primitives/legacy_metric/schema';
import { resolveMetric } from '../primitives/metric/resolve';
import type { MetricScene } from '../primitives/metric/scene';
import type { MetricNode } from '../primitives/metric/schema';
import { resolvePartition } from '../primitives/partition_chart/resolve';
import type { PartitionScene } from '../primitives/partition_chart/scene';
import type { PartitionChartNode } from '../primitives/partition_chart/schema';
import { resolveTagCloud } from '../primitives/tag_cloud/resolve';
import type { TagCloudScene } from '../primitives/tag_cloud/scene';
import type { TagCloudNode } from '../primitives/tag_cloud/schema';
import { resolveXy } from '../primitives/xy_chart/resolve';
import type { XyScene } from '../primitives/xy_chart/scene';
import type { XyChartNode } from '../primitives/xy_chart/schema';
import type { Scene } from '../scene/types';

import type { ResolveChartOptions } from './common';

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
