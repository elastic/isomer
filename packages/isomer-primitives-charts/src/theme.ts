/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Values mirror Elastic Charts' `LIGHT_THEME`/`DARK_THEME` metric section and
// EUI Borealis colors, so every renderer reproduces the Elastic Charts look.

/** Theme tones a mark can take instead of a literal color. */
export const TONES = [
  'default',
  'primary',
  'neutral',
  'success',
  'warning',
  'risk',
  'danger',
] as const;

/** One of {@link TONES}. */
export type Tone = (typeof TONES)[number];

/** The color scheme a chart paints in. */
export type Scheme = 'light' | 'dark';

/** Text colors for marks drawn on a light or a dark fill. */
export interface TextTokens {
  title: string;
  subtitle: string;
  extra: string;
}

interface ToneTokens {
  /** Tile fill: EUI Borealis severity colors, `primary` for `primary`. */
  solid: string;
}

/** Colors and sizes every renderer draws a chart with. */
export interface ChartTokens {
  fontFamily: string;
  /** Tile fill when no color is set. */
  background: string;
  border: string;
  /** Unfilled part of a progress bar. */
  barBackground: string;
  onLight: TextTokens;
  onDark: TextTokens;
  missing: string;
  titleWeight: 400 | 500 | 700;
  minHeight: number;
  /** A tile row's height when the host does not size the chart. */
  rowHeight: number;
  tones: Record<Tone, ToneTokens>;
}

const onLight: TextTokens = {
  title: '#111C2C',
  subtitle: '#1D2A3E',
  extra: '#1D2A3E',
};
const onDark: TextTokens = {
  title: '#E3E8F2',
  subtitle: '#CAD3E2',
  extra: '#CAD3E2',
};
const shared = {
  fontFamily: 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif',
  onLight,
  onDark,
  missing: 'N/A',
  titleWeight: 500 as const,
  minHeight: 80,
  rowHeight: 150,
};

/** {@link ChartTokens} per scheme, matching Elastic Charts' `LIGHT_THEME` and `DARK_THEME`. */
export const chartTokens: Record<Scheme, ChartTokens> = {
  light: {
    ...shared,
    background: '#FFFFFF',
    border: '#E3E8F2',
    barBackground: '#ECF1F9',
    tones: {
      default: { solid: '#E3E8F2' },
      primary: { solid: '#0B64DD' },
      neutral: { solid: '#B5E5F2' },
      success: { solid: '#24C292' },
      warning: { solid: '#FCD883' },
      risk: { solid: '#FF995E' },
      danger: { solid: '#EE4C48' },
    },
  },
  dark: {
    ...shared,
    background: '#111C2C',
    border: '#2B394F',
    barBackground: '#1D2A3E',
    tones: {
      default: { solid: '#E3E8F2' },
      primary: { solid: '#61A2FF' },
      neutral: { solid: '#B5E5F2' },
      success: { solid: '#24C292' },
      warning: { solid: '#FCD883' },
      risk: { solid: '#FF995E' },
      danger: { solid: '#EE4C48' },
    },
  },
};
