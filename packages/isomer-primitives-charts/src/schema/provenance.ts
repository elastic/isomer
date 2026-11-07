/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString, z } from '@elastic/isomer-sdk/schema';

const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Where a node came from. Hosts use it to show capture time and to build the node again; it is never rendered. */
export const provenanceSchema = z
  .strictObject({
    host: requiredString().describe(
      'The host that built the node, such as `kibana` or an agent.'
    ),
    hostVersion: z.string().min(1).optional(),
    capturedAt: isoDateTimeSchema.describe('When the data was captured.'),
    timeRange: z
      .strictObject({ from: isoDateTimeSchema, to: isoDateTimeSchema })
      .optional()
      .describe('The absolute time range the data was queried for.'),
    meta: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Host-defined and opaque to Isomer, never rendered: what the host needs to build the node again, such as the saved object and materializer it came from.'
      ),
  })
  .describe(
    'Where the node came from, so a host can show when it was captured and build it again. Never rendered.'
  );

/** Where a node came from. */
export type Provenance = z.infer<typeof provenanceSchema>;

const LOSS_KINDS = ['dropped', 'approximated', 'prerendered'] as const;

/** A record of something the source had that the node drops or approximates. */
export const lossSchema = z
  .strictObject({
    path: requiredString().describe(
      'Where in the source the loss is, such as `metrics[0].format`.'
    ),
    kind: z.enum(LOSS_KINDS),
    note: requiredString(),
  })
  .describe('Something the source had that this node drops or approximates.');

/** Something the source had that the node drops or approximates. */
export type Loss = z.infer<typeof lossSchema>;
