/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The one authoring source for every length the pack draws itself. They match
 * the charts pack's, so a Vega chart sits beside the other charts on a page.
 */
export const VEGA_LAYOUT = {
  /** The box a chart draws in without a node or host size, in pixels: 16:9 at the charts pack's width. */
  defaultSize: { width: 480, height: 270 },
  /** Height of the line a chart's link draws on below the chart, in pixels. */
  linkHeight: 18,
  /** The fallback note's padding and border, in pixels. It takes the chart's box. */
  note: { padding: 8, borderWidth: 1 },
  type: { title: 14, body: 12 },
} as const;
