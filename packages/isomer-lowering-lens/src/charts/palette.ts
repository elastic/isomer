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

/**
 * A named palette as `getOverridePaletteColors` regenerates it: `steps` bands,
 * or one per saved stop, spread evenly. Its colors are band indexes.
 */
export const namedPalette = (
  params: SavedParams,
  positioned = false
): CustomPalette<number> => {
  const bands = params.steps || params.stops?.length || DEFAULT_BANDS;
  return build(
    Array.from({ length: bands }, (_, band) => band),
    positions(params, positioned),
    params
  );
};

export interface Bounds {
  min: number;
  max: number;
}

/**
 * `getDataBoundsForPalette` over every row of the table, coercing cells as its
 * `Math.min`/`Math.max` do, so a `null` counts as 0.
 */
export const paletteBounds = (
  metric: readonly unknown[],
  {
    max,
    breakdown,
    row,
  }: { max?: readonly unknown[] | undefined; breakdown: boolean; row: number }
): Bounds => {
  const smallest = Math.min(...metric.map(Number));
  const greatest = Math.max(...metric.map(Number));
  if (!max && !breakdown) {
    return greatest < 0
      ? { min: greatest * 2, max: 0 }
      : { min: 0, max: greatest * 2 };
  }
  if (breakdown && !max) {
    return { min: smallest, max: greatest };
  }
  return { min: 0, max: max ? Number(max[row]) : greatest };
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
