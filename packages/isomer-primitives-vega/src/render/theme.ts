/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The one source of every value the pack adds to a spec's `config`: Kibana's
// Vega defaults (`VegaParser._setDefaultColors`) with EUI Borealis tokens,
// which `theme.test.ts` checks against the theme package. A spec's own
// `config` wins over each of them.

import { isSpecObject, type SpecObject } from '../schema/spec';

/** `light` or `dark`, chosen for every render. */
export type VegaScheme = 'light' | 'dark';

/** The colors and type a chart draws with in one scheme. */
export interface VegaTheme {
  readonly scheme: VegaScheme;
  /** Axis ticks, domains and grid lines: `borderBaseSubdued`. */
  readonly grid: string;
  /** Guide and chart titles: `textSubdued`. */
  readonly title: string;
  /** Guide labels: `textSubdued`. */
  readonly label: string;
  /** Text marks, and the pack's chrome: `textParagraph`. */
  readonly text: string;
  /** A mark's color when nothing colors it: `euiColorVis0`. */
  readonly mark: string;
  /** The categorical palette: `euiColorVis0`–`euiColorVis9`. */
  readonly palette: readonly string[];
  /** Behind the pack's chrome: `backgroundBasePlain`. The chart itself is transparent, as in Kibana. */
  readonly background: string;
  /** EUI's sans-serif family, so text measures the same in images as in a browser. */
  readonly font: string;
}

const PALETTE = [
  '#16C5C0',
  '#A6EDEA',
  '#61A2FF',
  '#BFDBFF',
  '#EE72A6',
  '#FFC7DB',
  '#F6726A',
  '#FFC9C2',
  '#EAAE01',
  '#FCD883',
] as const;

const FONT = 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif';

/** The theme for each scheme. */
export const VEGA_THEMES: Readonly<Record<VegaScheme, VegaTheme>> = {
  light: {
    scheme: 'light',
    grid: '#E3E8F2',
    title: '#516381',
    label: '#516381',
    text: '#384861',
    mark: PALETTE[0],
    palette: PALETTE,
    background: '#FFFFFF',
    font: FONT,
  },
  dark: {
    scheme: 'dark',
    grid: '#2B394F',
    title: '#98A8C3',
    label: '#98A8C3',
    text: '#B4C1D5',
    mark: PALETTE[0],
    palette: PALETTE,
    background: '#111C2C',
    font: FONT,
  },
};

const AREA_STOPS = 12;

/** Kibana's Vega-Lite area fill (`getDefaultAreaGradientFill`): 12 stops easing from 15% to full opacity. */
export const areaGradient = (color: string): SpecObject => {
  const [r, g, b] = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16)
  );
  return {
    gradient: 'linear',
    x1: 0,
    y1: 1,
    x2: 0,
    y2: 0,
    stops: Array.from({ length: AREA_STOPS }, (_, index) => {
      const offset = index / (AREA_STOPS - 1);
      const eased = -(Math.cos(Math.PI * offset) - 1) / 2;
      const opacity = Math.round((0.15 + 0.85 * eased) * 1000) / 1000;
      return { offset, color: `rgba(${r},${g},${b},${opacity})` };
    }),
  };
};

/** Mark types Kibana colors one by one in plain Vega, and the channel it sets. */
const VEGA_MARK_DEFAULTS = [
  ['arc', 'fill'],
  ['area', 'fill'],
  ['line', 'stroke'],
  ['path', 'stroke'],
  ['rect', 'fill'],
  ['rule', 'stroke'],
  ['shape', 'stroke'],
  ['symbol', 'fill'],
  ['text', 'fill'],
  ['trail', 'fill'],
] as const;

const configOf = (spec: SpecObject): SpecObject =>
  isSpecObject(spec.config) ? spec.config : {};

/** Kibana leaves a mark's color alone when the spec's `config.mark` or `config.<type>` sets one. */
const hasCustomColor = (
  config: SpecObject,
  markType: string,
  channel: string
): boolean =>
  [config.mark, config[markType]].some(
    (entry) =>
      isSpecObject(entry) &&
      (entry.color !== undefined || entry[channel] !== undefined)
  );

const shared = (theme: VegaTheme): SpecObject => ({
  background: 'transparent',
  font: theme.font,
  range: { category: [...theme.palette] },
  axis: {
    tickColor: theme.grid,
    domainColor: theme.grid,
    gridColor: theme.grid,
    titleFontWeight: 500,
  },
  style: {
    'guide-label': { fill: theme.label, font: theme.font },
    'guide-title': { fill: theme.title, font: theme.font },
    'group-title': { fill: theme.title, font: theme.font },
    'group-subtitle': { fill: theme.title, font: theme.font },
  },
  view: { stroke: null },
});

/** The Vega `config` Kibana gives a plain Vega `spec`, under the spec's own. */
export const vegaConfig = (theme: VegaTheme, spec: SpecObject): SpecObject => {
  const config = configOf(spec);
  const marks: SpecObject = {};
  for (const [markType, channel] of VEGA_MARK_DEFAULTS) {
    if (!hasCustomColor(config, markType, channel)) {
      marks[markType] = {
        [channel]: markType === 'text' ? theme.text : theme.mark,
      };
    }
  }
  return {
    ...shared(theme),
    ...marks,
    area: {
      ...(isSpecObject(marks.area) ? marks.area : {}),
      fillOpacity: 0.5,
    },
  };
};

/** The Vega-Lite `config` Kibana gives a Vega-Lite `spec`, under the spec's own. */
export const vegaLiteConfig = (
  theme: VegaTheme,
  spec: SpecObject
): SpecObject => ({
  ...shared(theme),
  mark: { color: theme.mark },
  area: {
    ...(hasCustomColor(configOf(spec), 'area', 'fill')
      ? {}
      : { fill: areaGradient(theme.mark) }),
    line: { strokeWidth: 1.5 },
    fillOpacity: 0.3,
  },
});
