/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lens color by value, end to end: `computePaletteParams` (metric
// `to_expression.ts`), the `palette` expression function (`palette_fn.ts`),
// `getDataBoundsForPalette` (`expression_metric`) and `workoutColorForValue`
// (`charts/public/services/palettes/helpers.ts`).

type Continuity = 'above' | 'below' | 'all' | 'none';

/** What `workoutColorForValue` reads; `colors` may be hex or band indexes. */
export interface CustomPalette<T = string> {
  colors: readonly T[];
  /** Where each color ends; empty spreads the colors evenly. */
  stops: readonly number[];
  range: 'number' | 'percent';
  continuity: Continuity;
  rangeMin: number;
  rangeMax: number;
}

interface SavedParams {
  steps?: number | undefined;
  rangeType?: 'number' | 'percent' | undefined;
  rangeMin?: number | null | undefined;
  rangeMax?: number | null | undefined;
  continuity?: Continuity | undefined;
  stops?: readonly { color: string; stop: number }[] | undefined;
}

const isMinContinuity = (continuity: Continuity) =>
  continuity === 'below' || continuity === 'all';
const isMaxContinuity = (continuity: Continuity) =>
  continuity === 'above' || continuity === 'all';

const build = <T>(
  colors: readonly T[],
  positions: readonly number[],
  {
    rangeType = 'percent',
    rangeMin,
    rangeMax,
    continuity = 'above',
  }: SavedParams
): CustomPalette<T> => ({
  colors,
  stops: positions,
  range: rangeType,
  continuity,
  rangeMin: isMinContinuity(continuity)
    ? Number.NEGATIVE_INFINITY
    : (rangeMin ?? positions[0] ?? 0),
  rangeMax: isMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
    : (rangeMax ?? positions.at(-1) ?? 100),
});

/** The custom palette Lens builds from saved `custom` params. */
const positions = (params: SavedParams, positioned: boolean) =>
  positioned ? (params.stops ?? []).map(({ stop }) => stop) : [];

/**
 * The palette Lens builds from saved `custom` colors. `positioned` is whether
 * `computePaletteParams` keeps the stop positions, which it decides by
 * `params.name` rather than the palette's own name.
 */
export const customPalette = (
  params: SavedParams,
  positioned = true
): CustomPalette =>
  build(
    (params.stops ?? []).map(({ color }) => color),
    positions(params, positioned),
    params
  );

/** Lens's `DEFAULT_COLOR_STEPS`. */
const DEFAULT_BANDS = 5;

/** How many bands `getOverridePaletteColors` regenerates a named palette with. */
export const namedPaletteBands = (params: SavedParams) =>
  params.steps || params.stops?.length || DEFAULT_BANDS;

/**
 * A named palette as `getOverridePaletteColors` regenerates it, spread evenly,
 * with band indexes for colors. Check {@link namedPaletteBands} first. Like
 * `computePaletteParams`, it ignores `params.reverse`.
 */
export const namedPalette = (
  params: SavedParams,
  positioned = false
): CustomPalette<number> =>
  build(
    Array.from({ length: namedPaletteBands(params) }, (_, band) => band),
    positions(params, positioned),
    params
  );

export interface Bounds {
  min: number;
  max: number;
}

/** The extremes `Math.min`/`Math.max` find over every row, so a `null` counts as 0. */
export const extent = (metric: readonly unknown[]): Bounds => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of metric) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return { min: NaN, max: NaN };
    }
    min = Math.min(min, number);
    max = Math.max(max, number);
  }
  return { min, max };
};

/** `getDataBoundsForPalette` for one row, from the metric column's {@link extent}. */
export const paletteBounds = (
  { min: smallest, max: greatest }: Bounds,
  {
    max,
    hasMax,
    breakdown,
  }: { max: unknown; hasMax: boolean; breakdown: boolean }
): Bounds => {
  if (!hasMax && !breakdown) {
    return greatest < 0
      ? { min: greatest * 2, max: 0 }
      : { min: 0, max: greatest * 2 };
  }
  if (breakdown && !hasMax) {
    return { min: smallest, max: greatest };
  }
  return { min: 0, max: hasMax ? Number(max) : greatest };
};

const segment = <T>(
  value: number,
  colors: readonly T[],
  min: number,
  max: number
) => {
  const step = (max - min) / colors.length;
  const index = colors.findIndex((_, i) => value - (min + (1 + i) * step) <= 0);
  return (
    colors[index] ??
    (value >= min + colors.length * step ? colors.at(-1) : colors[0])
  );
};

const byStops = <T>(
  value: number,
  colors: readonly T[],
  stops: readonly number[]
) => {
  const index = stops.findIndex((stop) => value - stop < 0);
  return (
    colors[index] ??
    (value >= (stops.at(-1) as number) ? colors.at(-1) : colors[0])
  );
};

/** The color Lens paints `value` with, or `undefined` for none. */
export const colorForValue = <T>(
  value: number,
  palette: CustomPalette<T>,
  bounds: Bounds
): T | undefined => {
  const { colors, stops, range, continuity, rangeMin, rangeMax } = palette;
  let normalized = value;
  if (range === 'percent') {
    normalized = (100 * (value - bounds.min)) / (bounds.max - bounds.min);
    if (!Number.isFinite(normalized)) {
      normalized = rangeMin;
    }
  }
  const [min, max] = range === 'percent' ? [0, 100] : [bounds.min, bounds.max];
  const low = isMinContinuity(continuity)
    ? Number.NEGATIVE_INFINITY
    : stops.length
      ? rangeMin
      : min;
  const high = isMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
    : stops.length
      ? rangeMax
      : max;
  if (normalized < low) {
    return isMinContinuity(continuity) ? colors[0] : undefined;
  }
  if (normalized > high) {
    return isMaxContinuity(continuity) ? colors.at(-1) : undefined;
  }
  return stops.length
    ? byStops(normalized, colors, stops)
    : segment(normalized, colors, min, max);
};
