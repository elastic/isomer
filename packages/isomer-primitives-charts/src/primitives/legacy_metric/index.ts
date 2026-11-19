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
import { type LegacyMetricNode, schema } from './schema';

export { catalog as legacyMetricCatalog } from './catalog';
export { examples as legacyMetricExamples } from './examples';
export { type LegacyMetricScene, type LegacyMetricTile } from './scene';
export {
  type LegacyMetricNode,
  LEGACY_METRIC_RULES,
  LEGACY_METRIC_SIZES,
  schema as legacyMetricSchema,
} from './schema';

/** The `legacyMetric` primitive, drawing through `config`. */
export const defineLegacyMetricPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'legacyMetric',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<LegacyMetricNode>(config),
  });

/** {@link defineLegacyMetricPrimitive} with the pack's defaults. */
export const legacyMetricPrimitive = defineLegacyMetricPrimitive(
  defaultChartPrimitiveConfig
);
