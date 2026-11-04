/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  navigationHref,
  type PrimitiveNode,
  requiredString,
  z,
} from '@elastic/isomer-sdk';

import { provenanceSchema } from './core';

export const unsupportedSchema = z
  .object({
    type: z.literal('unsupported'),
    title: requiredString().describe('The title of what could not be shown.'),
    reason: requiredString().describe(
      'Why it could not be shown, in words a reader understands.'
    ),
    link: z
      .strictObject({
        href: navigationHref(),
        label: requiredString(),
      })
      .optional()
      .describe('Where to see it instead, such as "Open in Kibana".'),
    source: provenanceSchema.optional(),
  })
  .describe(
    'A visible placeholder for something that could not be materialized or rendered, so nothing is dropped or approximated silently.'
  );

export type UnsupportedNode = z.infer<typeof unsupportedSchema> & PrimitiveNode;
