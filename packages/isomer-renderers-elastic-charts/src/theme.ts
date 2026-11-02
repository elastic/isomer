/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME, LIGHT_THEME } from '@elastic/charts';
import {
  type ChartsTheme,
  type ChartsThemes,
  chartsThemes,
  type ChartTokens,
  createChartTokens,
} from '@elastic/isomer-primitives-charts';

/**
 * The engine fields the portable projection needs. Full Elastic Charts themes
 * satisfy this shape without leaking their implementation types into host declarations.
 */
export interface ElasticChartsThemeSource {
  background: { color: string };
  colors: { defaultVizColor: string; vizColors: string[] };
  metric: {
    fontFamily: string;
    textDarkColor: string;
    textLightColor: string;
    textSubtitleDarkColor: string;
    textSubtitleLightColor: string;
    border: string;
    barBackground: string;
    minHeight: number;
    minValueFontSize: number;
  };
  lineSeriesStyle: {
    line: { strokeWidth: number };
    point: { radius: number };
  };
  areaSeriesStyle: { area: { opacity: number } };
}

/**
 * Project an application-resolved engine theme into the engine-free pack.
 * Status colors are host policy: an engine visualization palette has no good/bad semantics.
 * Container geometry remains host layout, not the engine's adaptive text-size algorithm.
 */
export function projectElasticChartsTheme(
  base: ElasticChartsThemeSource,
  mode: ChartsTheme['mode'],
  tone: ChartsTheme['tone'],
  tokens: ChartTokens = createChartTokens({
    fontFamily: base.metric.fontFamily,
    fontSize: 16,
    space: 4,
  })
): ChartsTheme {
  const dark = mode === 'dark';
  return {
    mode,
    background: base.background.color,
    text: dark ? base.metric.textLightColor : base.metric.textDarkColor,
    muted: dark
      ? base.metric.textSubtitleLightColor
      : base.metric.textSubtitleDarkColor,
    border: base.metric.border,
    accent: base.colors.defaultVizColor,
    secondary: base.colors.vizColors[1] ?? base.colors.defaultVizColor,
    track: base.metric.barBackground,
    tone,
    tokens: {
      ...tokens,
      tile: {
        ...tokens.tile,
        height: Math.max(tokens.tile.height, base.metric.minHeight),
        compactHeight: Math.max(
          tokens.tile.compactHeight,
          base.metric.minHeight
        ),
      },
      font: {
        ...tokens.font,
        minimumValue: base.metric.minValueFontSize,
      },
      trend: {
        ...tokens.trend,
        stroke: base.lineSeriesStyle.line.strokeWidth,
        pointRadius: base.lineSeriesStyle.point.radius,
        opacity: base.areaSeriesStyle.area.opacity,
      },
    },
  };
}

/** Standalone browser defaults. Application hosts should project their own resolved theme. */
export const elasticChartsThemes: ChartsThemes = {
  light: projectElasticChartsTheme(
    LIGHT_THEME,
    'light',
    chartsThemes.light.tone
  ),
  dark: projectElasticChartsTheme(DARK_THEME, 'dark', chartsThemes.dark.tone),
};
