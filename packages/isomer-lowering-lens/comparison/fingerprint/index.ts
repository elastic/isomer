/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractMetricFingerprint, type MetricFingerprint } from './metric';

export type {
  Box,
  DrawnElement,
  MetricFingerprint,
  MetricTileFingerprint,
} from './metric';
export { extractMetricFingerprint } from './metric';

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
    extract: extractMetricFingerprint,
    classes: [
      { path: /^(width|height)$/, feature: 'context.size', tolerance: pixel },
      {
        path: /^(tiles|empty)$|\.position|\.elements(\.[^.]+)?$/,
        feature: 'identity',
        tolerance: exact,
      },
      { path: /^tiles\[\]\.box\./, feature: 'layout.box', tolerance: pixel },
      {
        path: /\.elements\.[^.]+\.box\./,
        feature: 'layout.element',
        tolerance: pixel,
      },
      { path: /\.textRect\./, feature: 'layout.text', tolerance: pixel },
      { path: /\.interactive$/, feature: 'interactivity', tolerance: exact },
      {
        path: /\.style\.fontFamily$/,
        feature: 'font.family',
        tolerance: exact,
      },
      {
        path: /\.style\.font(Size|Weight)$/,
        feature: 'layout.font',
        tolerance: exact,
      },
      {
        path: /\.style\.(color|background|fill)$/,
        feature: 'color',
        tolerance: exact,
      },
      { path: /\.style\./, feature: 'paint', tolerance: exact },
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
      {
        path: /\.(title|subtitle|extra|value|label|text)$|\.secondary$/,
        feature: 'text',
        tolerance: exact,
      },
    ],
  },
};
