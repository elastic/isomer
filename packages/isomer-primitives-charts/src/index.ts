/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type ChartsPackOptions,
  CHARTS_INPUT_BUDGET,
  chartsPack,
  createChartsPack,
} from './pack';
export {
  type ChartNode,
  type ChartsPackTypes,
  type ChartsReactEnv,
  type ChartsRenderContext,
  type ReactSceneRenderer,
  type ResolveSceneOptions,
  type SceneResolver,
} from './render/context';
export { gridPrimitive, gridSnapshotHeight } from './render/grid';
export { defineChartPrimitives } from './render/primitives';
export {
  type SceneShimConfig,
  detectSceneEnvironment,
  renderSceneNode,
} from './render/scene_node';
export { CHARTS_THEME } from './render/theme';
export { unsupportedPrimitive } from './render/unsupported';
export { brushEvent, selectEvent } from './scene/events';
export {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from './scene/examples';
export { selectSceneRenderer } from './scene/select';
export {
  type AxisId,
  type ColorScheme,
  type MetricAlignment,
  type MetricLayout,
  type MetricScene,
  type MetricTile,
  type Scene,
  type SceneAnnotation,
  type SceneAxis,
  type SceneChrome,
  type SceneColor,
  type SceneColumn,
  type SceneEnvironment,
  type SceneInteractions,
  type SceneKind,
  type SceneLegend,
  type SceneLegendItem,
  type SceneReferenceLine,
  type SceneRenderEnv,
  type SceneRenderer,
  type SceneSelection,
  type SceneSize,
  type SceneSource,
  type SceneTable,
  type SceneTick,
  type SceneTooltip,
  type SceneTooltipEntry,
  type XyCategory,
  type XyMark,
  type XyScene,
  type XySceneLayer,
  type XySeries,
  SCENE_KINDS,
} from './scene/types';
export {
  gridCatalog,
  metricCatalog,
  unsupportedCatalog,
  xyChartCatalog,
} from './schema/catalog';
export {
  type ChartColors,
  type ColorBand,
  type ColorValue,
  chartColorsSchema,
  colorValueSchema,
} from './schema/colors';
export { chartCoreShape } from './schema/core';
export {
  type Cell,
  type ChartColumn,
  type ChartData,
  type ColumnRole,
  type ColumnType,
  type ScalarCell,
  cellSchema,
  chartDataSchema,
} from './schema/data';
export type {
  ChartBrushEvent,
  ChartEvent,
  ChartSelectEvent,
  SelectTarget,
} from './schema/events';
export {
  type Emphasis,
  CHART_EVENT_NAMES,
  INTERACTION_RULES,
  SELECT_TARGETS,
  brushingInteractionsSchemaFor,
  brushSchema,
  chartEventSchema,
  checkInteractions,
  emphasisSchema,
  interactionsCoreShape,
  interactionsSchemaFor,
  readChartEvent,
  selectSchema,
  toActionEvent,
} from './schema/events';
export { chartEventExamples } from './schema/examples/events';
export { gridExamples } from './schema/examples/grid';
export { metricExamples } from './schema/examples/metric';
export { unsupportedExamples } from './schema/examples/unsupported';
export { xyChartExamples } from './schema/examples/xy_chart';
export {
  type DurationUnit,
  type PortableFormat,
  portableFormatSchema,
} from './schema/format';
export {
  type GridNode,
  type GridPanel,
  type GridReadingEntry,
  type GridSection,
  GRID_COLUMNS,
  GRID_RULES,
  GRID_SINGLE_COLUMN_BELOW,
  gridReadingOrder,
  gridSchema,
  gridSchemaFor,
} from './schema/grid';
export { type MetricNode, METRIC_RULES, metricSchema } from './schema/metric';
export {
  type Loss,
  type Provenance,
  lossSchema,
  provenanceSchema,
} from './schema/provenance';
export { type ColumnReference, columnRefSchema } from './schema/references';
export { type UnsupportedNode, unsupportedSchema } from './schema/unsupported';
export { type XyChartNode, XY_RULES, xyChartSchema } from './schema/xy_chart';
export {
  sceneTableRows,
  sceneToMarkdown,
  sceneToText,
} from './text/scene_text';
