/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack, type Renderer } from '@elastic/isomer-sdk';

import { defineMetricPrimitive } from './metric';
import type { MetricNode } from './metric/schema';

/** A `react` renderer for every chart primitive, supplied by a renderer package. */
export interface ChartRenderers {
  metric: Renderer<MetricNode, 'react'>;
}

/** The charts pack, drawing `react` with `renderers`; text and Markdown are the pack's own. */
export const createChartsPack = (renderers: ChartRenderers) =>
  definePrimitivePack({
    id: 'charts',
    primitives: [defineMetricPrimitive(renderers.metric)],
    authoring: { groups: [{ title: 'Charts', types: ['metric'] }] },
  });
