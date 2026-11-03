/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractMetricFingerprint,
  type MetricFingerprint,
  NUMERIC_GLYPHS,
} from './metric';

export type { Box, MetricFingerprint, MetricTileFingerprint } from './metric';
export { NUMERIC_GLYPHS, extractMetricFingerprint } from './metric';

/** One fingerprint per kind of drawing a dashboard panel can hold. */
export type Fingerprint = MetricFingerprint;

export type FingerprintKind = Fingerprint['kind'];

/** How far two readings of one feature may differ. */
export type Tolerance =
  { type: 'exact' } | { type: 'absolute'; max: number; unit: string };

export interface FeatureClass {
  /** Matches a field path with array indices written as `[]`, such as `tiles[].box.x`. */
  path: RegExp;
  feature: string;
  tolerance: Tolerance;
}

export interface FingerprintKindDefinition {
  /** Self-contained, so Playwright can serialize it into a page. */
  extract: (root: Element) => Fingerprint | null;
  /** First match wins. A path no class matches compares exactly. */
  classes: readonly FeatureClass[];
}

const exact: Tolerance = { type: 'exact' };
// Measured at most 0.25 px across every case on Linux and macOS; one engine and release leaves only CSS grid rounding.
const pixel: Tolerance = { type: 'absolute', max: 1, unit: 'px' };

export const FINGERPRINT_KINDS: Record<
  FingerprintKind,
  FingerprintKindDefinition
> = {
  metric: {
    extract: (root) => extractMetricFingerprint(root, NUMERIC_GLYPHS.source),
    classes: [
      { path: /^(width|height)$/, feature: 'context.size', tolerance: pixel },
      {
        path: /^(tiles|empty)$|\.position/,
        feature: 'identity',
        tolerance: exact,
      },
      { path: /\.box\./, feature: 'layout.box', tolerance: pixel },
      { path: /Width$/, feature: 'layout.text', tolerance: pixel },
      {
        path: /FontSize$/,
        feature: 'layout.font',
        tolerance: exact,
      },
      {
        path: /Align$|\.orientation$/,
        feature: 'layout.align',
        tolerance: exact,
      },
      {
        path: /\.progress\.(start|end)$/,
        feature: 'progress.geometry',
        tolerance: exact,
      },
      {
        path: /\.trend\.paths\[\]\[\]$/,
        feature: 'trend.geometry',
        tolerance: exact,
      },
      {
        path: /\.trend(\.paths(\[\])?)?$/,
        feature: 'trend.shape',
        tolerance: exact,
      },
      {
        path: /\.progress(\.(now|min|max))?$/,
        feature: 'progress.value',
        tolerance: exact,
      },
      { path: /(background|[cC]olor)$/, feature: 'color', tolerance: exact },
      {
        path: /\.(title|subtitle|extra|value|label)$|\.secondary$/,
        feature: 'text',
        tolerance: exact,
      },
    ],
  },
};
