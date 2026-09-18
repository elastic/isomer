/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Byte sizes of one rendered payload.
 *
 * `html` counts markup only: inlined CSS and script bytes are subtracted out
 * and reported under `css` / `js`. `total` counts each part exactly once,
 * whether or not the CSS was inlined.
 */
export interface PayloadMeasurement {
  html: number;
  css: number;
  js: number;
  total: number;
}

/** UTF-8 byte length of `value`, which is not `length` for non-ASCII text. */
export const byteLength = (value: string): number =>
  new TextEncoder().encode(value).length;
