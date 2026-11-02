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
  mode: 'light' | 'dark';
  tokens: ChartTokens;
  background: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  secondary: string;
  track: string;
  tone: Record<'neutral' | 'good' | 'bad' | 'warning', string>;
}

export type ChartsThemes = { light: ChartsTheme; dark: ChartsTheme };

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

/** Use the same host-resolved themes for HTML and the snapshot frame. */
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

export const chartsStyleAdapter = createChartsStyleAdapter(chartsThemes);

/** Hosts may reframe charts, but must supply the same ChartsTheme to every frame. */
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

export const chartFrame = createChartFrame(chartsThemes);

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
