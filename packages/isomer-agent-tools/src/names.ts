/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Tool names, stable across releases because hosts and prompts refer to them. */
export const ISOMER_TOOL_NAMES = {
  authoringGuide: 'isomer_authoring_guide',
  describePrimitives: 'isomer_describe_primitives',
  validate: 'isomer_validate',
  render: 'isomer_render',
  listViews: 'isomer_list_views',
  requestView: 'isomer_request_view',
} as const;

export const ISOMER_AUTHORING_GUIDE_URI = 'isomer://authoring-guide';

export const ISOMER_COMPOSITION_SCHEMA_URI = 'isomer://composition-schema';

export const ISOMER_COMPOSE_PROMPT = 'compose';
