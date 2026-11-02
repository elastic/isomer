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

export const CHART_THEME = {
  fontFamily: 'Arial, sans-serif',
  tile: {
    width: 320,
    height: 200,
    compactHeight: 160,
    padding: 16,
    compactPadding: 8,
    gap: 12,
    border: 1,
    radius: 4,
  },
  font: {
    title: 16,
    value: 40,
    minimumValue: 16,
    secondary: 14,
    small: 12,
    weight: 500,
    lineHeight: 1.4,
  },
  trend: {
    width: 300,
    height: 80,
    stroke: 2,
    opacity: 0.18,
    padding: 4,
    barRatio: 0.7,
    pointRadius: 2,
  },
  frame: { width: 960, padding: 24 },
  glyph: { up: '\u2191', down: '\u2193', unchanged: '=', unavailable: '?' },
} as const;

/** Colors use the model's opaque six-digit hex contract. */
export interface ChartsTheme {
  mode: 'light' | 'dark';
  background: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  secondary: string;
  track: string;
  tone: Record<'neutral' | 'good' | 'bad' | 'warning', string>;
}

export const chartsThemes: { light: ChartsTheme; dark: ChartsTheme } = {
  light: {
    mode: 'light',
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

export interface ChartsRenderContext extends PrimitiveRenderContext {
  chartTheme?: ChartsTheme;
}
export interface ChartStyleCollector {
  rules: Set<'metric'>;
}
export const CHART_STYLE_COLLECTOR = 'isomer-metric-v1';

const isNode = (value: unknown): value is PrimitiveNode =>
  Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    typeof value.type === 'string'
  );

export const chartsStyleAdapter: HTMLStyleAdapter<
  PrimitiveNode,
  ChartStyleCollector,
  ChartsRenderContext
> = {
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
      chartsThemes[
        options.scheme ?? (options.theme === 'dark' ? 'dark' : 'light')
      ],
  }),
  renderStyles: (collector) =>
    collector.rules.has('metric')
      ? `
.isomer-metric {font-family:${CHART_THEME.fontFamily};line-height:${CHART_THEME.font.lineHeight}}
.isomer-metric * {box-sizing:border-box}
.isomer-metric button {font:inherit;cursor:pointer}
.isomer-metric button:focus-visible {outline:${CHART_THEME.trend.stroke}px solid currentColor}
.isomer-metric table {border-collapse:collapse;width:100%}
.isomer-metric th,.isomer-metric td {padding:${CHART_THEME.tile.compactPadding}px;text-align:left;border-bottom:${CHART_THEME.tile.border}px solid currentColor}
.isomer-metric summary {cursor:pointer}
`
      : '',
};

/** Hosts may reframe charts, but must supply the same ChartsTheme to every frame. */
export const chartFrame: Frame<ChartsTheme> = {
  defaultWidth: CHART_THEME.frame.width,
  sizing: 'content',
  theme: chartsThemes,
  estimateHeight: () => CHART_THEME.tile.height + CHART_THEME.frame.padding * 2,
  wrap: (header, body, { width, theme }) => (
    <section
      style={{
        width,
        padding: CHART_THEME.frame.padding,
        background: theme.background,
        color: theme.text,
        fontFamily: CHART_THEME.fontFamily,
      }}>
      {header.title ? <h1>{header.title}</h1> : null}
      {body}
    </section>
  ),
};

/** Black or white text chosen from the authored opaque tile color. */
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
