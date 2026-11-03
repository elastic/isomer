/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Values mirror Elastic Charts' `LIGHT_THEME`/`DARK_THEME` metric section and
// EUI Borealis colors, so every renderer reproduces the Elastic Charts look.

export const TONES = [
  'default',
  'primary',
  'neutral',
  'success',
  'warning',
  'risk',
  'danger',
] as const;

export type Tone = (typeof TONES)[number];

export type Scheme = 'light' | 'dark';

/** Text colors for marks drawn on a light or a dark fill. */
export interface TextTokens {
  title: string;
  subtitle: string;
  extra: string;
}

export interface ToneTokens {
  /** Tile fill: EUI Borealis severity colors, `primary` for `primary`. */
  solid: string;
  /** Badge fill: EUI `euiColorBackgroundLight*`. */
  softBackground: string;
  /** Badge text: EUI `euiColorText*`. */
  softText: string;
}

export interface ChartTokens {
  fontFamily: string;
  /** Tile fill when no color is set. */
  background: string;
  border: string;
  /** Unfilled part of a progress bar. */
  barBackground: string;
  /** Progress fill when a tile sets no color (Lens `euiColorVis2`). */
  progress: string;
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
  progress: '#61A2FF',
  onLight,
  onDark,
  missing: 'N/A',
  titleWeight: 500 as const,
  minHeight: 80,
  rowHeight: 150,
};

export const chartTokens: Record<Scheme, ChartTokens> = {
  light: {
    ...shared,
    background: '#FFFFFF',
    border: '#E3E8F2',
    barBackground: '#ECF1F9',
    tones: {
      default: {
        solid: '#E3E8F2',
        softBackground: '#E3E8F2',
        softText: '#384861',
      },
      primary: {
        solid: '#0B64DD',
        softBackground: '#D9E8FF',
        softText: '#1750BA',
      },
      neutral: {
        solid: '#B5E5F2',
        softBackground: '#CFEEF7',
        softText: '#0F658A',
      },
      success: {
        solid: '#24C292',
        softBackground: '#C9F3E3',
        softText: '#09724D',
      },
      warning: {
        solid: '#FCD883',
        softBackground: '#FDE9B5',
        softText: '#6A4906',
      },
      risk: {
        solid: '#FF995E',
        softBackground: '#FFDEBF',
        softText: '#9E3A16',
      },
      danger: {
        solid: '#EE4C48',
        softBackground: '#FDDDD8',
        softText: '#A71627',
      },
    },
  },
  dark: {
    ...shared,
    background: '#111C2C',
    border: '#2B394F',
    barBackground: '#1D2A3E',
    tones: {
      default: {
        solid: '#E3E8F2',
        softBackground: '#2B394F',
        softText: '#B4C1D5',
      },
      primary: {
        solid: '#61A2FF',
        softBackground: '#0D2F5E',
        softText: '#61A2FF',
      },
      neutral: {
        solid: '#B5E5F2',
        softBackground: '#003447',
        softText: '#37B8DC',
      },
      success: {
        solid: '#24C292',
        softBackground: '#0D362B',
        softText: '#24C292',
      },
      warning: {
        solid: '#FCD883',
        softBackground: '#3D3014',
        softText: '#FCD883',
      },
      risk: {
        solid: '#FF995E',
        softBackground: '#4A221C',
        softText: '#FF995E',
      },
      danger: {
        solid: '#EE4C48',
        softBackground: '#491D27',
        softText: '#F6726A',
      },
    },
  },
};
