/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Each primitive's catalog glyph, for hosts that list them. The fallbacks are
// EUI Borealis's first visualization color and its neighbours; a host restyles
// an icon through the `--isomer-icon-*` variables.

import type { PrimitiveIcon } from '@elastic/isomer-sdk';

const paint = {
  accent: 'var(--isomer-icon-accent, #16c5c0)',
  bg: 'var(--isomer-icon-bg, #e6f9f7)',
  fg: 'var(--isomer-icon-fg, #1d2a3e)',
  muted: 'var(--isomer-icon-muted, #8ad8d4)',
};

/** A charts icon: a `bg` tile under `glyph`, with one stroke convention. */
const chartsIcon = (glyph: string): PrimitiveIcon => ({
  svg: `<svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" rx="3" fill="${paint.bg}"/>${glyph}</svg>`,
});

/** A label above a large value, and a trend under it. */
export const metricIcon = chartsIcon(
  `<path d="M4 4.5h4" stroke="${paint.muted}"/><rect x="4" y="6.5" width="8" height="3" rx="1" fill="${paint.accent}"/><polyline points="4 12 6.5 11 9 11.5 12 10" stroke="${paint.fg}"/>`
);

/** A large value, centered, over its label. */
export const legacyMetricIcon = chartsIcon(
  `<rect x="4" y="4.5" width="8" height="4" rx="1" fill="${paint.accent}"/><path d="M5.5 11.5h5" stroke="${paint.fg}"/>`
);

/** Axes and a rising line through its points. */
export const xyChartIcon = chartsIcon(
  `<polyline points="3 3 3 13 13 13" stroke="${paint.fg}"/><polyline points="5 10.5 7.5 7.5 9.5 9 12.5 4.5" stroke="${paint.accent}"/>`
);

/** A pie with one slice pulled out. */
export const partitionChartIcon = chartsIcon(
  `<path d="M7.5 3.5a5 5 0 1 0 5 5h-5z" fill="${paint.muted}"/><path d="M9 2v5h5a5 5 0 0 0-5-5z" fill="${paint.accent}"/><path d="M7.5 3.5a5 5 0 1 0 5 5" stroke="${paint.fg}"/>`
);

/** A dial with a needle. */
export const gaugeIcon = chartsIcon(
  `<path d="M3 11.5a5 5 0 0 1 10 0" stroke="${paint.muted}"/><path d="M3 11.5a5 5 0 0 1 3.5-4.77" stroke="${paint.accent}"/><path d="M8 11.5l2.5-3.5" stroke="${paint.fg}"/>`
);

/** Words of three sizes. */
export const tagCloudIcon = chartsIcon(
  `<path d="M3 6h5" stroke="${paint.accent}" stroke-width="2.5"/><path d="M9.5 6h3.5M3 9.5h3M7.5 9.5h5.5" stroke="${paint.fg}"/><path d="M4 12.5h3M8.5 12.5h3" stroke="${paint.muted}"/>`
);

/** A grid of cells in three shades. */
export const heatmapIcon = chartsIcon(
  `<rect x="3" y="3" width="3" height="3" fill="${paint.accent}"/><rect x="6.5" y="3" width="3" height="3" fill="${paint.muted}"/><rect x="10" y="3" width="3" height="3" fill="${paint.fg}"/><rect x="3" y="6.5" width="3" height="3" fill="${paint.muted}"/><rect x="6.5" y="6.5" width="3" height="3" fill="${paint.fg}"/><rect x="10" y="6.5" width="3" height="3" fill="${paint.accent}"/><rect x="3" y="10" width="3" height="3" fill="${paint.fg}"/><rect x="6.5" y="10" width="3" height="3" fill="${paint.accent}"/><rect x="10" y="10" width="3" height="3" fill="${paint.muted}"/>`
);

/** A shaded header row above rules. */
export const dataTableIcon = chartsIcon(
  `<rect x="3" y="3" width="10" height="3" rx="1" fill="${paint.accent}"/><path d="M3 8.5h10M3 11h10M3 13.5h10" stroke="${paint.fg}"/><path d="M7.5 7v6.5" stroke="${paint.muted}"/>`
);

/** Panels of different sizes on a dashboard. */
export const gridIcon = chartsIcon(
  `<rect x="3" y="3" width="4" height="4" rx="1" fill="${paint.accent}"/><rect x="8.5" y="3" width="4.5" height="4" rx="1" fill="${paint.muted}"/><rect x="3" y="8.5" width="10" height="4.5" rx="1" fill="${paint.muted}"/>`
);

/** A panel that can't be drawn: a frame crossed out. */
export const unsupportedIcon = chartsIcon(
  `<rect x="3" y="3" width="10" height="10" rx="1.5" stroke="${paint.fg}"/><path d="M5.5 10.5l5-5" stroke="${paint.accent}"/>`
);
