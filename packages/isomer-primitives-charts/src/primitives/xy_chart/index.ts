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
import { schema, type XyChartNode } from './schema';

export { catalog as xyChartCatalog } from './catalog';
export { chartEventExamples } from './events';
export { examples as xyChartExamples } from './examples';
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
} from './scene';
export { type XyChartNode, XY_RULES, schema as xyChartSchema } from './schema';

/** The `xyChart` primitive, drawing through `config`. */
export const defineXyChartPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'xyChart',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<XyChartNode>(config),
  });

/** {@link defineXyChartPrimitive} with the pack's defaults. */
export const xyChartPrimitive = defineXyChartPrimitive(
  defaultChartPrimitiveConfig
);
