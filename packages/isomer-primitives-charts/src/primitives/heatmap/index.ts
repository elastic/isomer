/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ChartPrimitiveConfig, chartPrimitiveParts } from '../../render';
import { defaultChartPrimitiveConfig } from '../defaults';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { type HeatmapNode, schema } from './schema';

export { catalog as heatmapCatalog } from './catalog';
export { examples as heatmapExamples } from './examples';
export {
  type HeatmapAxis,
  type HeatmapBand,
  type HeatmapCategory,
  type HeatmapCell,
  type HeatmapScene,
} from './scene';
export {
  type HeatmapNode,
  HEATMAP_RULES,
  schema as heatmapSchema,
} from './schema';

/** The `heatmap` primitive, drawing through `config`. */
export const defineHeatmapPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'heatmap',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<HeatmapNode>(config),
  });

/** {@link defineHeatmapPrimitive} with the pack's defaults. */
export const heatmapPrimitive = defineHeatmapPrimitive(
  defaultChartPrimitiveConfig
);
