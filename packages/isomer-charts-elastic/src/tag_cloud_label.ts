/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The label under a tag cloud, as Kibana's tag cloud draws it: EUI's `s` text, bold, on one line. */
export const TAG_CLOUD_LABEL = {
  /** In pixels. */
  size: 14,
  /** In pixels: the cloud draws in the height above it. */
  lineHeight: 20,
  /** EUI's bold. */
  weight: 700,
} as const;
