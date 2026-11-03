/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kept out of the package's declarations: Elastic Charts' own types fail
// `skipLibCheck: false` consumers.

import type { ReactNode } from 'react';
import {
  type ElementClickListener,
  LayoutDirection,
  type MetricDatum,
  MetricTrendShape,
  type PartialTheme,
  type SecondaryMetricProps,
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
  const {
    title,
    subtitle,
    value,
    number,
    fill,
    valueColor,
    secondary,
    visual,
  } = tile;
  const base = {
    color: visual?.kind === 'progress' ? visual.color : fill,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(valueColor === undefined
      ? {}
      : { valueColor, background: tokens.background }),
    ...(secondary ? { extra: toExtra(secondary) } : {}),
  };
  if (visual?.kind === 'progress') {
    return {
      ...base,
      // As Lens does, a missing reading is NaN, which Elastic Charts' meter leaves empty.
      value: number ?? Number.NaN,
      // Elastic Charts formats the domain's ends with this too, as value/target labels.
      valueFormatter: (reading: number) =>
        reading === number
          ? value
          : reading === visual.max
            ? visual.maxReading
            : reading === visual.min
              ? visual.minReading
              : value,
      // An explicit `domainMin` switches Elastic Charts to value/target labels, which Lens never sets.
      ...(visual.min === 0 ? {} : { domainMin: visual.min }),
      domainMax: visual.max,
      progressBarDirection:
        visual.direction === 'horizontal'
          ? LayoutDirection.Horizontal
          : LayoutDirection.Vertical,
    };
  }
  if (number === undefined) {
    return visual?.kind === 'trend'
      ? { ...base, value, ...trend(visual, title) }
      : { ...base, value };
  }
  const numeric = { ...base, value: number, valueFormatter: () => value };
  return visual?.kind === 'trend'
    ? { ...numeric, ...trend(visual, title) }
    : numeric;
};

const trend = (
  { points, shape }: Extract<ResolvedMetricTile['visual'], { kind: 'trend' }>,
  title: string | undefined
) => ({
  trend: points.map(({ x, y }) => ({ x, y: y ?? NaN })),
  trendShape: shape === 'bars' ? MetricTrendShape.Bars : MetricTrendShape.Area,
  ...(title === undefined ? {} : { trendA11yTitle: title }),
});

/** The action of the tile a click landed on; `undefined` for a tile without one. */
export const tileAction = (
  { tiles, columns }: Pick<ResolvedMetric, 'tiles' | 'columns'>,
  [event]: Parameters<ElementClickListener>[0]
) =>
  event && 'type' in event && event.type === 'metricElementEvent'
    ? tiles[event.rowIndex * columns + event.columnIndex]?.action
    : undefined;

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
