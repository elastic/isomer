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
  /** Resolved chart surface, not a theme identifier. */
  background: {
    /** CSS background color. */
    color: string;
  };
  /** Visualization paint sources; these do not encode good/bad status. */
  colors: {
    /** Primary paint; portable contrast requires opaque six-digit hex. */
    defaultVizColor: string;
    /** Ordered paints; index 1 becomes secondary, falling back to defaultVizColor. */
    vizColors: string[];
  };
  /** Resolved engine metric styles consumed by the portable projection. */
  metric: {
    /** CSS font stack used unless the host supplies portable tokens. */
    fontFamily: string;
    /** Dark foreground selected for portable light mode. */
    textDarkColor: string;
    /** Light foreground selected for portable dark mode. */
    textLightColor: string;
    /** Supporting foreground selected for portable light mode. */
    textSubtitleDarkColor: string;
    /** Supporting foreground selected for portable dark mode. */
    textSubtitleLightColor: string;
    /** CSS border paint for metric tiles. */
    border: string;
    /** CSS progress-track background. */
    barBackground: string;
    /** Minimum metric container height in CSS pixels. */
    minHeight: number;
    /** Minimum adaptive value size in CSS pixels, projected to the baseline fit floor. */
    minValueFontSize: number;
  };
  /** Engine line/isolated-point styles, also projected into baseline sparks. */
  lineSeriesStyle: {
    /** Line geometry. */
    line: {
      /** Stroke width in engine pixels / baseline SVG coordinates. */
      strokeWidth: number;
    };
    /** Point geometry. */
    point: {
      /** Point radius in engine pixels / baseline SVG coordinates. */
      radius: number;
    };
  };
  /** Engine area fill style, also projected into baseline sparks. */
  areaSeriesStyle: {
    /** Area geometry. */
    area: {
      /** Unitless fill opacity in the range zero to one. */
      opacity: number;
    };
  };
}

/**
 * Project an application-resolved engine theme into the engine-free pack.
 * Status colors are host policy: an engine visualization palette has no good/bad semantics.
 * Container geometry remains host layout, not the engine's adaptive text-size algorithm.
 * @param base - Already-resolved engine theme; not mutated or validated here.
 * @param mode - Matching host scheme; not inferred from background luminance.
 * @param tone - Host semantic paints (opaque six-digit hex), independent of palette order.
 * @param tokens - Optional host layout. Omitted uses the engine font stack,
 * 16px base font and 4px spacing. Supplied fontFamily is retained.
 * @returns A new portable theme. Tile/compact heights are raised to engine
 * minHeight; minimumValue, trend stroke/radius/opacity are replaced by engine
 * values. Other supplied roles are retained. Secondary uses vizColors[1], or
 * defaultVizColor when absent. Tone is retained by reference, not cloned.
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

/**
 * Portable projections of installed Elastic Charts light/dark defaults with
 * standalone fallback semantic tone colors. Not an implicit EUI/Kibana theme;
 * application hosts should project their own resolved engine themes and tones.
 */
export const elasticChartsThemes: ChartsThemes = {
  light: projectElasticChartsTheme(
    LIGHT_THEME,
    'light',
    chartsThemes.light.tone
  ),
  dark: projectElasticChartsTheme(DARK_THEME, 'dark', chartsThemes.dark.tone),
};
