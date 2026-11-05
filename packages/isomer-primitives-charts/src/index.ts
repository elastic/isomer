/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type ResolveChartOptions } from './scene/common';
export { brushEvent, selectEvent } from './scene/events';
export {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from './scene/examples';
export { formatAxisValue } from './scene/format_axis';
export { type ChartNode, resolveChart } from './scene/resolve';
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
  type SceneDomain,
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
  type DurationOutputUnit,
  type DurationUnit,
  type PortableFormat,
  FORMAT_RULES,
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
export { type ChartGlyph, CHART_GLYPHS, glyphSchema } from './schema/icons';
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
