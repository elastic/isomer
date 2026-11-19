/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type ChartGlyph, CHART_GLYPHS } from '../glyphs';
export {
  type TableAlignment,
  type TableCell,
  type TableColumn,
  type TableOrder,
  type TableRow,
  type TableScene,
} from '../primitives/data_table/scene';
export {
  type GaugeBand,
  type GaugeScene,
  type GaugeSceneShape,
} from '../primitives/gauge/scene';
export {
  type HeatmapAxis,
  type HeatmapBand,
  type HeatmapCategory,
  type HeatmapCell,
  type HeatmapScene,
} from '../primitives/heatmap/scene';
export {
  type LegacyMetricScene,
  type LegacyMetricTile,
} from '../primitives/legacy_metric/scene';
export {
  type MetricAlignment,
  type MetricLayout,
  type MetricScene,
  type MetricTile,
} from '../primitives/metric/scene';
export {
  type PartitionLayer,
  type PartitionLegend,
  type PartitionLegendItem,
  type PartitionNode,
  type PartitionScene,
  type PartitionSceneShape,
} from '../primitives/partition_chart/scene';
export {
  type TagCloudScene,
  type TagCloudWord,
} from '../primitives/tag_cloud/scene';
export {
  type AxisId,
  type SceneAnnotation,
  type SceneAxis,
  type SceneDomain,
  type SceneLegend,
  type SceneLegendItem,
  type SceneReferenceLine,
  type XyCategory,
  type XyMark,
  type XyScene,
  type XySceneLayer,
  type XySeries,
} from '../primitives/xy_chart/scene';
// eslint-disable-next-line no-restricted-imports -- `render/index.ts` reaches React, which `./scene` must not.
export { cls } from '../render/cls';
export {
  type ColorScheme,
  type Scene,
  type SceneChrome,
  type SceneColor,
  type SceneColumn,
  type SceneEnvironment,
  type SceneInteractions,
  type SceneKind,
  type SceneRenderEnv,
  type SceneRenderer,
  type SceneSelection,
  type SceneSize,
  type SceneSource,
  type SceneTable,
  type SceneTooltip,
  type SceneTooltipEntry,
  SCENE_KINDS,
  brushEvent,
  formatAxisValue,
  metricSingleValueScene,
  selectEvent,
  selectSceneRenderer,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from '../scene';
export type {
  ChartBrushEvent,
  ChartEvent,
  ChartSelectEvent,
  SelectTarget,
} from '../schema';
export { createVarsModule, varStyle } from '../styles';
export { px } from '../theme';
export type { LocalVarGroup, StyleHandle } from '@elastic/distillate';
