/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

/**
 * The glyphs a chart can draw beside a value, line or event: what each shows,
 * and the EUI icon it is drawn as by default. An engine without EUI draws the
 * same subject.
 */
export const CHART_GLYPHS = {
  alert: { shows: 'a warning triangle with an exclamation mark', eui: 'alert' },
  asterisk: { shows: 'an asterisk', eui: 'asterisk' },
  bell: { shows: 'a bell', eui: 'bell' },
  bolt: { shows: 'a lightning bolt', eui: 'bolt' },
  bug: { shows: 'a bug', eui: 'bug' },
  circle: { shows: 'a filled circle', eui: 'circle' },
  comment: { shows: 'a speech bubble', eui: 'editor_comment' },
  external: {
    shows: 'a box with an arrow leaving its corner',
    eui: 'popout',
  },
  flag: { shows: 'a flag on a pole', eui: 'flag' },
  globe: { shows: 'a globe', eui: 'globe' },
  heart: { shows: 'a heart', eui: 'heart' },
  marker: { shows: 'a map pin marking a location', eui: 'map_marker' },
  pin: { shows: 'an outlined push pin', eui: 'pin' },
  pinFilled: { shows: 'a filled push pin', eui: 'pin_filled' },
  processor: { shows: 'a processor chip', eui: 'compute' },
  sortDown: { shows: 'an arrow pointing down', eui: 'sort_down' },
  sortUp: { shows: 'an arrow pointing up', eui: 'sort_up' },
  star: { shows: 'an outlined star', eui: 'star_empty' },
  starFilled: { shows: 'a filled star', eui: 'star_filled' },
  tag: { shows: 'a price tag', eui: 'tag' },
  temperature: { shows: 'a thermometer', eui: 'temperature' },
  triangle: { shows: 'a filled triangle pointing up', eui: 'triangle' },
} as const satisfies Record<string, { shows: string; eui: string }>;

/** A glyph a chart can draw. */
export type ChartGlyph = keyof typeof CHART_GLYPHS;

/** A glyph by name. */
export const glyphSchema = z
  .enum(Object.keys(CHART_GLYPHS) as [ChartGlyph, ...ChartGlyph[]])
  .describe(
    `A glyph: ${Object.entries(CHART_GLYPHS)
      .map(([name, { shows }]) => `\`${name}\` (${shows})`)
      .join(', ')}.`
  );
