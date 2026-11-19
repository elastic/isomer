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
import { schema, type TagCloudNode } from './schema';

export { catalog as tagCloudCatalog } from './catalog';
export { examples as tagCloudExamples } from './examples';
export { type TagCloudScene, type TagCloudWord } from './scene';
export {
  type TagCloudNode,
  TAG_CLOUD_KEY_RULE,
  TAG_CLOUD_RULES,
  schema as tagCloudSchema,
} from './schema';

/** The `tagCloud` primitive, drawing through `config`. */
export const defineTagCloudPrimitive = (config: ChartPrimitiveConfig) =>
  definePrimitive({
    type: 'tagCloud',
    catalog,
    icon,
    examples,
    schema,
    ...chartPrimitiveParts<TagCloudNode>(config),
  });

/** {@link defineTagCloudPrimitive} with the pack's defaults. */
export const tagCloudPrimitive = defineTagCloudPrimitive(
  defaultChartPrimitiveConfig
);
