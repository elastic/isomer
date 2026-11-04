/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one authoring source for every length, ratio and glyph `isomer-svg`
// draws. Colors come from the Scene. Type sizes follow Elastic Charts' light
// theme: axis tick labels 10 px, axis titles and legend labels 12 px.

export const SVG_THEME = {
  /** The size drawn when the Scene carries none, per kind, in pixels. */
  defaultSize: {
    xy: { width: 480, height: 240 },
    metric: { width: 240, height: 160 },
  },
  font: {
    family: 'Inter, "Elastic UI Numeric", sans-serif',
    tick: 10,
    axisTitle: 12,
    legend: 12,
    valueLabel: 10,
    /** Average glyph width as a share of the font size, for laying out text. */
    widthRatio: 0.6,
    /** Line height as a multiple of the font size. */
    lineHeight: 1.2,
  },
  xy: {
    padding: 8,
    tickLength: 4,
    tickGap: 3,
    axisTitleGap: 4,
    axisStrokeWidth: 1,
    gridStrokeWidth: 1,
    lineWidth: 2,
    pointRadius: 3,
    /** Radius of an emphasized point, and stroke width around an emphasized bar. */
    emphasisRadius: 5,
    emphasisStroke: 2,
    /** Radius of the transparent target a line or area mark takes gestures with. */
    hitRadius: 6,
    /** Share of a band left empty around its bars. */
    bandPadding: 0.2,
    /** Share of the plot a single time or linear bar takes, when there is no neighbor to measure. */
    loneBarWidth: 0.1,
    /** Opacity of marks in a partial bucket. */
    partialOpacity: 0.5,
    referenceFillOpacity: 0.1,
    annotationRangeOpacity: 0.15,
    annotationLineWidth: 1,
    currentTimeDash: '4 3',
    /** Stroke dash per Scene dash name. */
    dash: { solid: undefined, dashed: '6 4', dotted: '2 3' },
    /** Dash of a segment drawn across a gap by a fitting function. */
    fittedDash: '4 3',
  },
  legend: {
    swatch: 10,
    swatchGap: 6,
    itemGap: 12,
    rowHeight: 18,
    /** Width of a legend beside the plot. */
    sideWidth: 140,
    hiddenOpacity: 0.4,
  },
  interaction: {
    /** Opacity of series other than the one under the pointer. */
    dimOpacity: 0.3,
    /** Pixels a drag must cover before it is a brush rather than a click. */
    brushThreshold: 4,
    brushOpacity: 0.15,
    focusStrokeWidth: 2,
    focusPadding: 3,
    tooltip: { padding: 6, gap: 8, radius: 4, swatch: 8, size: 12 },
  },
  metric: {
    padding: 12,
    gap: 4,
    title: 14,
    subtitle: 12,
    secondary: 12,
    /** Value size bounds, in pixels; `fill` sizing may use the larger cap. */
    valueMin: 12,
    valueMax: { auto: 40, fill: 96 },
    progressThickness: 8,
    /** Share of the tile height a trend line occupies, at the bottom. */
    trendHeight: 0.4,
    trendAreaOpacity: 0.2,
    badgePadding: 4,
    badgeRadius: 3,
    /** Glyphs before a secondary value by direction. */
    badgeGlyph: { increase: '↑', decrease: '↓', neutral: '' },
    borderWidth: 1,
  },
} as const;
