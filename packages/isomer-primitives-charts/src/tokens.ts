/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Host typography and spacing used by the portable, non-measuring renderer. */
export interface ChartTokenSource {
  /** Resolved CSS font-family stack, not a font-loading instruction. */
  fontFamily: string;
  /** Positive finite base text size in CSS pixels, supplied by the host. */
  fontSize: number;
  /** Nonnegative finite spacing unit in CSS pixels, supplied by the host. */
  space: number;
}

/**
 * Baseline layout, not Elastic Charts' responsive text measurement. The host can
 * replace any derived role (for example tile height or frame width) in its theme.
 * Font/viewport roles scale with fontSize; padding/gap/radius scale with space.
 * The helper performs arithmetic only and does not validate or clamp inputs.
 * @param source - Resolved CSS font stack, positive finite pixel font size and
 * nonnegative finite pixel spacing. No application theme is read implicitly.
 * @returns A fresh token tree; default ratios are standalone layout policy.
 */
export function createChartTokens({
  fontFamily,
  fontSize,
  space,
}: ChartTokenSource) {
  return {
    /** CSS font stack shared by labels, values and baseline trend text. */
    fontFamily,
    /** Tile box dimensions in CSS pixels. */
    tile: {
      /** Regular metric container height: 12.5 times the base font size. */
      height: fontSize * 12.5,
      /** Compact metric container height: 10 times the base font size. */
      compactHeight: fontSize * 10,
      /** Regular tile inset: four spacing units. */
      padding: space * 4,
      /** Compact tile/table inset: two spacing units. */
      compactPadding: space * 2,
      /** Grid gap: three spacing units. */
      gap: space * 3,
      /** Tile outline width in CSS pixels. */
      border: 1,
      /** Tile corner radius: one spacing unit. */
      radius: space,
    },
    /** Baseline text roles; browser metric text sizing belongs to the engine. */
    font: {
      /** Figure caption size in CSS pixels: one base font size. */
      title: fontSize,
      /** Baseline headline size in CSS pixels: 2.5 base font sizes. */
      value: fontSize * 2.5,
      /** Baseline fit floor in CSS pixels; engine projection replaces this. */
      minimumValue: fontSize,
      /** Secondary/table text size in CSS pixels: 0.875 base font sizes. */
      secondary: fontSize * 0.875,
      /** Small labels in CSS pixels: 0.75 base font sizes. */
      small: fontSize * 0.75,
      /** Numeric CSS font weight for titles/headlines. */
      weight: 500,
      /** Unitless CSS line-height multiplier. */
      lineHeight: 1.4,
    },
    /** Baseline SVG viewport/marks; engine projection replaces mark style roles. */
    trend: {
      /** Internal SVG coordinate width, scaled to the available CSS width. */
      width: fontSize * 18.75,
      /** Sparkline viewport height in CSS pixels: five base font sizes. */
      height: fontSize * 5,
      /** Baseline line width in SVG coordinates; projected from engine stroke. */
      stroke: 2,
      /** Unitless area fill opacity from zero to one. */
      opacity: 0.18,
      /** Plot inset in SVG coordinates: one spacing unit. */
      padding: space,
      /** Fraction of a sample slot occupied by a baseline bar. */
      barRatio: 0.7,
      /** Isolated-point radius in SVG coordinates; projected from engine radius. */
      pointRadius: 2,
    },
    /** Standalone content-frame dimensions in CSS pixels. */
    frame: {
      /** Default frame width: 60 base font sizes. */
      width: fontSize * 60,
      /** Frame content inset: six spacing units. */
      padding: space * 6,
    },
  };
}
/**
 * Resolved portable layout roles returned by `createChartTokens`.
 * Tile/frame sizes and fonts use CSS pixels; trend width/padding/stroke/radius
 * use SVG coordinates, with trend height also setting the CSS viewport height.
 * Weight is numeric CSS weight, lineHeight is unitless, opacity is 0-1 and
 * barRatio is a slot fraction. Hosts may replace roles after derivation.
 */
export type ChartTokens = ReturnType<typeof createChartTokens>;

/**
 * Standalone system-font baseline using 16px text and a 4px spacing unit.
 * Application hosts should derive tokens from their own theme instead.
 */
export const defaultChartTokens = createChartTokens({
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  space: 4,
});

/** Semantic text alternatives, not a font icon registry or a geometry token. */
export const METRIC_GLYPHS = {
  /** Positive raw change; does not imply good. */
  up: '\u2191',
  /** Negative raw change; does not imply bad. */
  down: '\u2193',
  /** Exactly zero raw change, independent of display rounding. */
  unchanged: '=',
  /** Missing comparison side. */
  unavailable: '?',
} as const;
