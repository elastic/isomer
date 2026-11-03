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
  /** Badge fill: EUI `euiColorBackgroundLight*`. */
  softBackground: string;
  /** Badge text: EUI `euiColorText*`. */
  softText: string;
}

/** Colors and sizes every renderer draws a chart with. */
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

/** {@link ChartTokens} per scheme, matching Elastic Charts' `LIGHT_THEME` and `DARK_THEME`. */
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

/** Lens's named color-by-value palettes, by palette registry id. */
export const VALUE_PALETTES = [
  'status',
  'temperature',
  'complementary',
  'negative',
  'positive',
  'cool',
  'warm',
  'gray',
] as const;

export type ValuePalette = (typeof VALUE_PALETTES)[number];

/** The most bands a value palette has: Lens's `LENS_PALETTE_MAX_COLOR_RANGES`. */
export const MAX_PALETTE_BANDS = 5;

/**
 * EUI Borealis' `euiPaletteFor*` output for 1–5 bands, indexed by band count
 * minus one. Borealis gives the same vis colors in both schemes.
 */
export const valuePaletteColors: Record<
  ValuePalette,
  readonly (readonly string[])[]
> = {
  status: [
    ['#24C292'],
    ['#24C292', '#F6726A'],
    ['#24C292', '#FCD883', '#F6726A'],
    ['#24C292', '#AEE8D2', '#FFC9C2', '#F6726A'],
    ['#24C292', '#AEE8D2', '#FCD883', '#FFC9C2', '#F6726A'],
  ],
  temperature: [
    ['#61A2FF'],
    ['#61A2FF', '#F6726A'],
    ['#61A2FF', '#EBEFF5', '#F6726A'],
    ['#61A2FF', '#CFE1FF', '#FFD4CF', '#F6726A'],
    ['#61A2FF', '#CFE1FF', '#F6F9FC', '#FFD4CF', '#F6726A'],
  ],
  complementary: [
    ['#61A2FF'],
    ['#61A2FF', '#EAAE01'],
    ['#61A2FF', '#F6F9FC', '#EAAE01'],
    ['#61A2FF', '#ACCEFE', '#F0D47F', '#EAAE01'],
    ['#61A2FF', '#ACCEFE', '#F6F9FC', '#F0D47F', '#EAAE01'],
  ],
  negative: [
    ['#FFC9C2'],
    ['#FEB7B0', '#F6726A'],
    ['#FDCDC9', '#FDA198', '#F6726A'],
    ['#FCD8D6', '#FEB7B0', '#FC968D', '#F6726A'],
    ['#FCDFDD', '#FEC4BF', '#FEAAA2', '#FB8F86', '#F6726A'],
  ],
  positive: [
    ['#AEE8D2'],
    ['#9FDFC6', '#24C292'],
    ['#BDE8D8', '#7FD5B4', '#24C292'],
    ['#CBECE1', '#9FDFC6', '#6DD1AC', '#24C292'],
    ['#D4EFE6', '#B1E4D1', '#8CD9BB', '#62CEA6', '#24C292'],
  ],
  cool: [
    ['#A3CBFF'],
    ['#ADCCFF', '#61A2FF'],
    ['#C4DAFF', '#95BEFF', '#61A2FF'],
    ['#CFE1FF', '#ADCCFF', '#89B7FF', '#61A2FF'],
    ['#D6E5FF', '#BAD5FF', '#9FC4FF', '#82B3FF', '#61A2FF'],
  ],
  warm: [
    ['#F6726A'],
    ['#FFB5AC', '#F6726A'],
    ['#FFCAC3', '#FE9F96', '#F6726A'],
    ['#FFD5CF', '#FFB5AC', '#FC948B', '#F6726A'],
    ['#FFDBD6', '#FFC2BA', '#FFA89F', '#FB8D84', '#F6726A'],
  ],
  gray: [
    ['#8E9FBC'],
    ['#7B8AA4', '#1D2A3E'],
    ['#A2AEC4', '#596883', '#1D2A3E'],
    ['#B6C0D3', '#7B8AA4', '#485872', '#1D2A3E'],
    ['#C2CBDB', '#92A0B8', '#667690', '#3F4E67', '#1D2A3E'],
  ],
};
