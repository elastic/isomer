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
import { type MetricNode, schema } from './schema';

export { catalog as metricCatalog } from './catalog';
export { examples as metricExamples } from './examples';
export {
  type MetricAlignment,
  type MetricLayout,
  type MetricScene,
  type MetricTile,
} from './scene';
export {
  type MetricNode,
  METRIC_RULES,
  schema as metricSchema,
} from './schema';

/** The `metric` primitive, drawing through `config`. */
export const defineMetricPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'metric',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<MetricNode>(config),
  });

/** {@link defineMetricPrimitive} with the pack's defaults. */
export const metricPrimitive = defineMetricPrimitive(
  defaultChartPrimitiveConfig
);
