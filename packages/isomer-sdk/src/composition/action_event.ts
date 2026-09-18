/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A named event a node can raise, for the host to interpret.
 *
 * The SDK carries the reference and never dispatches it: side effects are the
 * host's, so `name` means whatever its handler decides.
 */
export interface ActionEventRef {
  /** Agreed between the composition's author and the host's handler. */
  name: string;
  /** Payload passed through untouched, so it must be JSON-serializable. */
  context?: Record<string, unknown>;
}
