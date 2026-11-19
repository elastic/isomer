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
import { type GaugeNode, schema } from './schema';

export { catalog as gaugeCatalog } from './catalog';
export { examples as gaugeExamples } from './examples';
export { type GaugeBand, type GaugeScene, type GaugeSceneShape } from './scene';
export {
  type GaugeNode,
  type GaugeShape,
  GAUGE_RULES,
  GAUGE_SHAPES,
  schema as gaugeSchema,
} from './schema';

/** The `gauge` primitive, drawing through `config`. */
export const defineGaugePrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'gauge',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<GaugeNode>(config),
  });

/** {@link defineGaugePrimitive} with the pack's defaults. */
export const gaugePrimitive = defineGaugePrimitive(defaultChartPrimitiveConfig);
