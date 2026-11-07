/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The glyphs a chart can draw beside a value, line or event: what each shows,
 * and the EUI icon type it is drawn as by default. Without `eui`, or without
 * EUI, an engine draws the same subject itself.
 */
export const CHART_GLYPHS = {
  alert: { shows: 'a warning triangle with an exclamation mark', eui: 'alert' },
  asterisk: { shows: 'an asterisk', eui: 'asterisk' },
  bell: { shows: 'a bell', eui: 'bell' },
  bolt: { shows: 'a lightning bolt', eui: 'bolt' },
  bug: { shows: 'a bug', eui: 'bug' },
  circle: { shows: 'a filled circle', eui: 'dot' },
  comment: { shows: 'a speech bubble', eui: 'editorComment' },
  external: {
    shows: 'a box with an arrow leaving its corner',
    eui: 'external',
  },
  flag: { shows: 'a flag on a pole', eui: 'flag' },
  globe: { shows: 'a globe', eui: 'globe' },
  heart: { shows: 'a heart', eui: 'heart' },
  marker: { shows: 'a map pin marking a location', eui: 'mapMarker' },
  pin: { shows: 'an outlined push pin', eui: 'pin' },
  pinFilled: { shows: 'a filled push pin', eui: 'pinFilled' },
  processor: { shows: 'a processor chip', eui: 'compute' },
  sortDown: { shows: 'an arrow pointing down', eui: 'sortDown' },
  sortUp: { shows: 'an arrow pointing up', eui: 'sortUp' },
  star: { shows: 'an outlined star', eui: 'starEmpty' },
  starFilled: { shows: 'a filled star', eui: 'starFilled' },
  tag: { shows: 'a price tag', eui: 'tag' },
  temperature: { shows: 'a thermometer', eui: 'temperature' },
  triangle: { shows: 'a filled triangle pointing up' },
} as const satisfies Record<string, { shows: string; eui?: string }>;

/** A glyph a chart can draw. */
export type ChartGlyph = keyof typeof CHART_GLYPHS;
