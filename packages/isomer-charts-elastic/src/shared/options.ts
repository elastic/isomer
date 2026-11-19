/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ElasticChartsOptions {
  /** Writes Elastic Charts' `DebugState` to the chart, as Kibana's functional tests read it. */
  readonly debugState?: boolean;
}
