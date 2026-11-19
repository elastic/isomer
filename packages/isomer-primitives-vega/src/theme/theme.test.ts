/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';

import { areaGradient, VEGA_THEMES, vegaConfig, vegaLiteConfig } from './theme';

const require = createRequire(import.meta.url);
const colors = (file: string) =>
  require(
    `@elastic/eui-theme-borealis/lib/cjs/variables/colors/${file}.js`
  ) as Record<string, Record<string, string>>;

// Kibana's `VegaThemeColors.borealis` (`vis_types/vega/public/data_model/utils.ts`).
describe('Vega theme', () => {
  it.each([
    ['light', colors('_colors_light'), '', '_colors_vis_light'],
    ['dark', colors('_colors_dark'), 'dark_', '_colors_vis_dark'],
  ] as const)(
    '%s is Kibana’s Borealis Vega theme',
    (scheme, tokens, prefix, visFile) => {
      const text = tokens[`${prefix}text_colors`]!;
      const border = tokens[`${prefix}border_colors`]!;
      const background = tokens[`${prefix}background_colors`]!;
      const vis = Object.values(colors(visFile))[0]!;
      const palette = Array.from(
        { length: 10 },
        (_, index) => vis[`euiColorVis${index}`]
      );
      expect(VEGA_THEMES[scheme]).toEqual({
        scheme,
        grid: border.borderBaseSubdued,
        title: text.textSubdued,
        label: text.textSubdued,
        text: text.textParagraph,
        mark: vis.euiColorVis0,
        palette,
        background: background.backgroundBasePlain,
        font: 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif',
      });
    }
  );
});

describe('vegaConfig', () => {
  const theme = VEGA_THEMES.light;

  it('colors each mark type as Kibana does, unless the spec colors it', () => {
    const config = vegaConfig(theme, {});
    expect(config.rect).toEqual({ fill: theme.mark });
    expect(config.line).toEqual({ stroke: theme.mark });
    expect(config.text).toEqual({ fill: theme.text });
    expect(config.area).toEqual({ fill: theme.mark, fillOpacity: 0.5 });
    const custom = vegaConfig(theme, {
      config: { mark: { color: '#123456' }, rule: { stroke: '#654321' } },
    });
    expect(custom.rect).toBeUndefined();
    expect(custom.rule).toBeUndefined();
  });

  it('gives Vega-Lite areas Kibana’s gradient, unless the spec fills them', () => {
    expect(vegaLiteConfig(theme, {}).area).toMatchObject({
      fill: areaGradient(theme.mark),
      fillOpacity: 0.3,
    });
    expect(
      vegaLiteConfig(theme, { config: { area: { color: 'red' } } }).area
    ).not.toHaveProperty('fill');
  });

  // `getDefaultAreaGradientFill`: 12 stops, opacity 0.15 + 0.85 × inOutSine(offset).
  it('eases the gradient from 15% to full opacity over 12 stops', () => {
    const { stops } = areaGradient('#16C5C0') as {
      stops: { offset: number; color: string }[];
    };
    expect(stops).toHaveLength(12);
    expect(stops[0]).toEqual({ offset: 0, color: 'rgba(22,197,192,0.15)' });
    expect(stops[11]).toEqual({ offset: 1, color: 'rgba(22,197,192,1)' });
    expect(stops[6]?.color).toBe('rgba(22,197,192,0.635)');
  });
});
