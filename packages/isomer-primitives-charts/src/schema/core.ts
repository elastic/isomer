/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk/schema';

import { chartColorsSchema } from './colors';
import { chartDataSchema } from './data';
import { lossSchema, provenanceSchema } from './provenance';

/** The fields every chart primitive shares. Spread into each chart's schema. */
export const chartCoreShape = {
  title: z.string().optional(),
  description: z
    .string()
    .optional()
    .describe('What the chart shows, for accessible and text surfaces.'),
  data: chartDataSchema,
  colors: chartColorsSchema.optional(),
  source: provenanceSchema.optional(),
  losses: z.array(lossSchema).optional(),
};
