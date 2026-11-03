/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept out of the package's declarations: Elastic Charts' own types fail
// `skipLibCheck: false` consumers.

import type { ReactNode } from 'react';
import type {
  MetricDatum,
  PartialTheme,
  SecondaryMetricProps,
} from '@elastic/charts';
import type {
  ResolvedMetric,
  ResolvedMetricTile,
} from '@elastic/isomer-primitives-charts/model';

const TooltipLabel = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => <span title={label}>{children}</span>;

const toExtra = ({
  label,
  labelPosition,
  value,
  badge,
  description,
}: NonNullable<ResolvedMetricTile['secondary']>): SecondaryMetricProps => ({
  value: value ?? '',
  ...(label === undefined ? {} : { label, labelPosition }),
  ...(labelPosition === 'tooltip' ? { labelTooltip: TooltipLabel } : {}),
  ...(badge
    ? {
        badgeColor: badge.background,
        badgeTextColor: badge.text,
        ...(badge.glyph ? { icon: badge.glyph } : {}),
      }
    : {}),
  ariaDescription: description,
});

/** One Elastic Charts datum per resolved tile. */
export const toDatum = (
  tile: ResolvedMetricTile,
  tokens: ResolvedMetric['tokens']
): MetricDatum => {
  const { title, subtitle, value, number, fill, valueColor, secondary } = tile;
  const base = {
    color: fill,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(valueColor === undefined
      ? {}
      : { valueColor, background: tokens.background }),
    ...(secondary ? { extra: toExtra(secondary) } : {}),
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
    extraTextAlign: layout.secondaryAlign,
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
