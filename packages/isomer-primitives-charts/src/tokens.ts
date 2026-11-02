/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Host typography and spacing used by the portable, non-measuring renderer. */
export interface ChartTokenSource {
  fontFamily: string;
  fontSize: number;
  space: number;
}

/**
 * Baseline layout, not Elastic Charts' responsive text measurement. The host can
 * replace any derived role (for example tile height or frame width) in its theme.
 */
export function createChartTokens({
  fontFamily,
  fontSize,
  space,
}: ChartTokenSource) {
  return {
    fontFamily,
    tile: {
      height: fontSize * 12.5,
      compactHeight: fontSize * 10,
      padding: space * 4,
      compactPadding: space * 2,
      gap: space * 3,
      border: 1,
      radius: space,
    },
    font: {
      title: fontSize,
      value: fontSize * 2.5,
      minimumValue: fontSize,
      secondary: fontSize * 0.875,
      small: fontSize * 0.75,
      weight: 500,
      lineHeight: 1.4,
    },
    trend: {
      width: fontSize * 18.75,
      height: fontSize * 5,
      stroke: 2,
      opacity: 0.18,
      padding: space,
      barRatio: 0.7,
      pointRadius: 2,
    },
    frame: { width: fontSize * 60, padding: space * 6 },
  };
}
export type ChartTokens = ReturnType<typeof createChartTokens>;

/** Standalone baseline only; application hosts should derive tokens from their theme. */
export const defaultChartTokens = createChartTokens({
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  space: 4,
});

/** Semantic text alternatives, not a font icon registry or a geometry token. */
export const METRIC_GLYPHS = {
  up: '\u2191',
  down: '\u2193',
  unchanged: '=',
  unavailable: '?',
} as const;
