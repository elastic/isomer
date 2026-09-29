/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideCommandNode } from './schema';

/** Canonical {@link SlideCommandNode} example. */
export const example: SlideCommandNode = {
  type: 'slideCommand',
  label: 'Start the local store',
  command: 'docker compose up --detach inventory',
};

/** A leading variable in `primary`, and no label. */
export const highlightExample: SlideCommandNode = {
  type: 'slideCommand',
  command: 'REGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01',
  highlightPrefix: 'REGION=eu-west-1',
};

/** A long command that takes a smaller step. */
export const longExample: SlideCommandNode = {
  type: 'slideCommand',
  label: 'Export last month’s refunds',
  command:
    'pg_dump --table=refunds --data-only --column-inserts --file=refunds.sql "$DB_URL"',
};

/** Conformance examples for {@link SlideCommandNode}. */
export const examples: SlideCommandNode[] = [
  example,
  highlightExample,
  longExample,
];
