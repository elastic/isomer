/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Frame,
  PrimitiveNode,
  PrimitiveRenderContext,
} from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';

import { type ChartTokens, defaultChartTokens } from './tokens';

/** Resolved host presentation. Metric accent/tone paints must be opaque six-digit hex. */
export interface ChartsTheme {
  /** Selects the matching browser base theme; must agree with the host's scheme. */
  mode: 'light' | 'dark';
  /** Resolved typography and geometry; lengths are CSS pixels unless noted. */
  tokens: ChartTokens;
  /** CSS surface color behind tiles and trends. */
  background: string;
  /** CSS foreground for labels and non-filled content. */
  text: string;
  /** CSS foreground for supporting descriptions. */
  muted: string;
  /** CSS tile and metric border color. */
  border: string;
  /** Default primary paint, as opaque six-digit hex for baseline contrast. */
  accent: string;
  /** Secondary trend paint, as opaque six-digit hex. */
  secondary: string;
  /** CSS color behind unfilled progress. */
  track: string;
  /** Host-owned semantic paints, all opaque six-digit hex; not palette order. */
  tone: Record<'neutral' | 'good' | 'bad' | 'warning', string>;
}

/** One resolved host theme per scheme, shared by the style adapter and frame. */
export type ChartsThemes = {
  /** Light presentation; its dimensions establish frame defaults. */
  light: ChartsTheme;
  /** Dark presentation, with `mode: 'dark'`. */
  dark: ChartsTheme;
};

/** Standalone fallback palettes, not Kibana/EUI themes or Elastic Charts defaults. */
export const chartsThemes: ChartsThemes = {
  light: {
    mode: 'light',
    tokens: defaultChartTokens,
    background: '#ffffff',
    text: '#1d1e24',
    muted: '#535966',
    border: '#c4c9d4',
    accent: '#006bb4',
    secondary: '#8c4ba8',
    track: '#e9edf3',
    tone: {
      neutral: '#535966',
      good: '#21764a',
      bad: '#bd271e',
      warning: '#805600',
    },
  },
  dark: {
    mode: 'dark',
    tokens: defaultChartTokens,
    background: '#1d1e24',
    text: '#f1f3f5',
    muted: '#b3b9c5',
    border: '#535966',
    accent: '#54b1ff',
    secondary: '#cba0e0',
    track: '#343741',
    tone: {
      neutral: '#b3b9c5',
      good: '#6dccb1',
      bad: '#ff9188',
      warning: '#f5cb6b',
    },
  },
};

/** Host interaction/anchor context plus an optional resolved chart theme. */
export interface ChartsRenderContext extends PrimitiveRenderContext {
  /** Used by primitive dispatch when no explicit frame theme is supplied. */
  chartTheme?: ChartsTheme;
}
/** Per-render style requirements; never share a collector across renders. */
export interface ChartStyleCollector {
  /** Deduplicated structural rule groups requested by visited primitives. */
  rules: Set<'metric'>;
}
/** Compatibility identifier linking the chart primitive to its style collector. */
export const CHART_STYLE_COLLECTOR = 'isomer-metric-v1';

const isNode = (value: unknown): value is PrimitiveNode =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    typeof value.type === 'string'
  );

/**
 * Bind HTML collection to the same resolved pair used by the snapshot frame.
 * Each render receives a fresh collector. An explicit scheme wins over the
 * theme name; otherwise only the name `dark` selects dark presentation.
 */
export function createChartsStyleAdapter(
  themes: ChartsThemes
): HTMLStyleAdapter<PrimitiveNode, ChartStyleCollector, ChartsRenderContext> {
  return {
    styleCollector: CHART_STYLE_COLLECTOR,
    createCollector: () => ({ rules: new Set() }),
    collectViewStyles: (
      composition,
      dispatcher,
      collector,
      context,
      _options,
      scope
    ) => {
      const visit = (value: unknown) => {
        if (!isNode(value)) {
          return;
        }
        dispatcher.collectStyles(value, collector, context);
        for (const child of scope.walk(value)) {
          visit(child.node);
        }
      };
      composition.body.forEach(visit);
    },
    createRenderContext: (_collector, options) => ({
      chartTheme:
        themes[options.scheme ?? (options.theme === 'dark' ? 'dark' : 'light')],
    }),
    renderStyles: (collector) =>
      collector.rules.has('metric')
        ? `
.isomer-metric * {box-sizing:border-box}
.isomer-metric button {font:inherit;cursor:pointer}
.isomer-metric button:focus-visible {outline:revert}
.isomer-metric summary {cursor:pointer}
`
        : '',
  };
}

/** HTML style adapter using standalone fallback themes, not the host's theme. */
export const chartsStyleAdapter = createChartsStyleAdapter(chartsThemes);

/**
 * Create a content-sized frame using resolved host themes.
 * Default width and estimated height use light-theme tokens; wrapping uses the
 * selected theme. All frames in the runtime must accept the same theme type.
 */
export function createChartFrame(themes: ChartsThemes): Frame<ChartsTheme> {
  return {
    defaultWidth: themes.light.tokens.frame.width,
    sizing: 'content',
    theme: themes,
    estimateHeight: () =>
      themes.light.tokens.tile.height + themes.light.tokens.frame.padding * 2,
    wrap: (header, body, { width, theme }) => (
      <section
        style={{
          width,
          padding: theme.tokens.frame.padding,
          background: theme.background,
          color: theme.text,
          fontFamily: theme.tokens.fontFamily,
        }}>
        {header.title ? <h1>{header.title}</h1> : null}
        {body}
      </section>
    ),
  };
}

/** Content-sized frame using standalone fallback tokens and colors. */
export const chartFrame = createChartFrame(chartsThemes);

/**
 * Choose black or white by the greater WCAG relative-luminance contrast ratio.
 * @param color - Opaque six-digit hex (`#rrggbb`); CSS names and alpha are rejected.
 * @returns `#000000` or `#ffffff`; ties choose black.
 * @throws {TypeError} If the color is not opaque six-digit hex.
 */
export function metricContrast(color: string): string {
  if (!/^#[\da-f]{6}$/i.test(color)) {
    throw new TypeError(
      'metricContrast requires an opaque six-digit hex color'
    );
  }
  const rgb = color
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = Number.parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  const luminance = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#ffffff';
}
