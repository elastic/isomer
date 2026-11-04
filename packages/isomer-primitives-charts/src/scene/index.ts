/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ChartBrushEvent,
  ChartEvent,
  ChartSelectEvent,
  SelectTarget,
} from '../schema/events';
export { type ResolveChartOptions } from './common';
export { brushEvent, selectEvent } from './events';
export {
  metricSingleValueScene,
  xyInteractiveScene,
  xyTimeSeriesScene,
} from './examples';
export { type ChartNode, resolveChart } from './resolve';
export { selectSceneRenderer } from './select';
export {
  CATEGORICAL_PALETTE,
  CHART_CHROME,
  categoricalColor,
  resolveColor,
} from './theme';
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
  type XySeries,
  SCENE_KINDS,
} from './types';
