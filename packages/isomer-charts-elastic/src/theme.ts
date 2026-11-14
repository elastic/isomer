/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The base theme every Kibana chart draws on, as Kibana's charts plugin builds
// it (`charts/public/services/theme/theme.ts`, `getChartsBaseTheme`), with the
// Scene's chrome colors laid over it.

import { getChartsTheme, type PartialTheme, type Theme } from '@elastic/charts';
import type {
  ColorScheme,
  SceneChrome,
} from '@elastic/isomer-primitives-charts/scene';

/** Kibana's charts theme name for EUI's Borealis theme. */
export const KIBANA_THEME_NAME = 'borealis';

/** Prepended to every chart font, as Kibana's `applyNumericFontFamily` does. */
export const ELASTIC_UI_NUMERIC_FONT_FAMILY = "'Elastic UI Numeric'";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneJson = <T>(value: T): T =>
  Array.isArray(value)
    ? (value.map(cloneJson) as T)
    : isRecord(value)
      ? (Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)])
        ) as T)
      : value;

const applyNumericFontFamily = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(applyNumericFontFamily);
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'fontFamily' && typeof entry === 'string') {
      value[key] = entry.includes(ELASTIC_UI_NUMERIC_FONT_FAMILY)
        ? entry
        : `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, ${entry}`;
    } else {
      applyNumericFontFamily(entry);
    }
  }
};

const build = (scheme: ColorScheme): Theme => {
  const theme = cloneJson(
    getChartsTheme({ name: KIBANA_THEME_NAME, darkMode: scheme === 'dark' })
  );
  applyNumericFontFamily(theme);
  const { fill } = theme.axes.tickLabel;
  theme.axes.axisTitle.fill = fill;
  theme.axes.axisTitle.fontWeight = 500;
  theme.axes.axisPanelTitle.fill = fill;
  theme.axes.axisPanelTitle.fontWeight = 500;
  return theme;
};

const themes: Partial<Record<ColorScheme, Theme>> = {};

/** Kibana's charts base theme for a scheme. */
export const kibanaBaseTheme = (scheme: ColorScheme): Theme =>
  (themes[scheme] ??= build(scheme));

/** The Scene's chrome over the base theme: axis, grid line and background colors. Axis text keeps the base theme's fill. */
export const chromeTheme = (chrome: SceneChrome): PartialTheme => ({
  background: { color: chrome.background },
  axes: {
    axisLine: { stroke: chrome.axis },
    tickLine: { stroke: chrome.axis },
    gridLine: {
      horizontal: { stroke: chrome.gridLine },
      vertical: { stroke: chrome.gridLine },
    },
  },
  legend: { labelOptions: { maxLines: 1 } },
});
