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
import { type PartitionChartNode, schema } from './schema';

export { catalog as partitionChartCatalog } from './catalog';
export { examples as partitionChartExamples } from './examples';
export {
  type PartitionLayer,
  type PartitionLegend,
  type PartitionLegendItem,
  type PartitionNode,
  type PartitionScene,
  type PartitionSceneShape,
} from './scene';
export {
  type PartitionChartNode,
  type PartitionShape,
  PARTITION_KEY_RULE,
  PARTITION_MAX_GROUPS,
  PARTITION_RULES,
  PARTITION_SHAPES,
  schema as partitionChartSchema,
} from './schema';

/** The `partitionChart` primitive, drawing through `config`. */
export const definePartitionChartPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'partitionChart',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<PartitionChartNode>(config),
  });

/** {@link definePartitionChartPrimitive} with the pack's defaults. */
export const partitionChartPrimitive = definePartitionChartPrimitive(
  defaultChartPrimitiveConfig
);
