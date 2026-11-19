/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Scene is what `resolveChart` returns and the only thing a renderer reads.
// Colors, text, series, legend order and draw order are decided here, and so
// are a time axis's ticks. An engine chooses other ticks, domains, stacking and
// point density from the intent each axis and series states, and formats only
// through `formatAxisValue`.

import type { TableScene } from '../primitives/data_table/scene';
import type { GaugeScene } from '../primitives/gauge/scene';
import type { HeatmapScene } from '../primitives/heatmap/scene';
import type { LegacyMetricScene } from '../primitives/legacy_metric/scene';
import type { MetricScene } from '../primitives/metric/scene';
import type { PartitionScene } from '../primitives/partition_chart/scene';
import type { TagCloudScene } from '../primitives/tag_cloud/scene';
import type { XyScene } from '../primitives/xy_chart/scene';
import type { ChartEvent } from '../schema';

import type { SceneKind } from './base';

/** What a renderer draws: a {@link MetricScene}, an {@link XyScene}, a {@link TableScene}, a {@link PartitionScene}, a {@link HeatmapScene}, a {@link GaugeScene}, a {@link TagCloudScene} or a {@link LegacyMetricScene}. */
export type Scene =
  | MetricScene
  | XyScene
  | TableScene
  | PartitionScene
  | HeatmapScene
  | GaugeScene
  | TagCloudScene
  | LegacyMetricScene;

/** Where a renderer draws: a browser DOM, or Node with no DOM. */
export type SceneEnvironment = 'browser' | 'node';

/** What a renderer is told about where it draws, beside the Scene itself. */
export interface SceneRenderEnv {
  readonly environment: SceneEnvironment;
  /** True when the Scene's `size.width` is a layout estimate and the container's width is the drawn one, which a renderer that can fills. */
  readonly fillWidth?: boolean;
  /** The node's `id`, which events name. A renderer raises no event for a node without one. */
  readonly nodeId?: string;
  /** Receives every raised event. Absent means the chart offers no interaction. */
  readonly onEvent?: (event: ChartEvent) => void;
  /** Resolves the pack's own style handles to class names, for a renderer that draws with the pack's styles. */
  readonly resolveClassName?: (
    ...handles: { readonly key: string; readonly readableName: string }[]
  ) => string;
}

/**
 * Describes a renderer for a Scene. This interface does not provide renderer
 * selection or a fallback. `TOutput` is what the renderer produces, such as a
 * React node.
 */
export interface SceneRenderer<TOutput = unknown> {
  /** Such as `elastic-charts`, `elastic-charts-node`, `isomer-svg` or `echarts`. */
  readonly id: string;
  readonly environments: readonly SceneEnvironment[];
  /**
   * True when the renderer draws a fixed-size picture at the Scene's `size`,
   * such as an SVG, so a Scene drawn by it always carries one.
   */
  readonly sized?: boolean;
  /** True when the renderer fills its container, so in a browser the container takes the chart's size spec. */
  readonly fluid?: boolean;
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
