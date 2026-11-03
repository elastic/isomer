/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept out of the package's declarations: Elastic Charts' own types fail
// `skipLibCheck: false` consumers.

import type { MetricDatum, PartialTheme } from '@elastic/charts';
import type {
  ResolvedMetric,
  ResolvedMetricTile,
} from '@elastic/isomer-primitives-charts/model';

/** One Elastic Charts datum per resolved tile. */
export const toDatum = (
  tile: ResolvedMetricTile,
  tokens: ResolvedMetric['tokens']
): MetricDatum => {
  const { title, subtitle, value, number, fill, valueColor } = tile;
  const base = {
    color: fill,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(valueColor === undefined
      ? {}
      : { valueColor, background: tokens.background }),
  };
  return number === undefined
    ? { ...base, value }
    : { ...base, value: number, valueFormatter: () => value };
};

const WEIGHTS = { 400: 'normal', 500: 500, 700: 'bold' } as const;

/** Elastic Charts' metric theme from the resolved layout and tokens. */
export const toTheme = ({ layout, tokens }: ResolvedMetric): PartialTheme => ({
  background: { color: tokens.background },
  metric: {
    fontFamily: tokens.fontFamily,
    textDarkColor: tokens.onLight.title,
    textSubtitleDarkColor: tokens.onLight.subtitle,
    textExtraDarkColor: tokens.onLight.extra,
    textLightColor: tokens.onDark.title,
    textSubtitleLightColor: tokens.onDark.subtitle,
    textExtraLightColor: tokens.onDark.extra,
    titlesTextAlign: layout.titleAlign,
    valueTextAlign: layout.valueAlign,
    valuePosition: layout.valuePosition,
    valueFontSize: layout.valueSize,
    spacing: layout.density === 'compact' ? 'small' : 'large',
    border: tokens.border,
    barBackground: tokens.barBackground,
    nonFiniteText: tokens.missing,
    titleWeight: WEIGHTS[tokens.titleWeight],
    minHeight: tokens.minHeight,
  },
});
