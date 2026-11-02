/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { DARK_THEME, getChartsTheme, LIGHT_THEME } from '@elastic/charts';
import {
  chartsPack,
  createChartFrame,
  createChartsStyleAdapter,
  createChartTokens,
  metricExamples,
} from '@elastic/isomer-primitives-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import {
  createElasticChartsRendererOverrides,
  elasticChartsThemes,
  projectElasticChartsTheme,
} from './index';
import { metricSettings } from './metric';

describe('host chart themes', () => {
  it.each([
    ['light', LIGHT_THEME],
    ['dark', DARK_THEME],
  ] as const)(
    'projects %s engine styles rather than maintaining a second browser palette',
    (mode, engine) => {
      const projected = elasticChartsThemes[mode];
      expect(projected.background).toBe(engine.background.color);
      expect(projected.accent).toBe(engine.colors.defaultVizColor);
      expect(projected.secondary).toBe(engine.colors.vizColors[1]);
      expect(projected.track).toBe(engine.metric.barBackground);
      expect(projected.tokens.fontFamily).toBe(engine.metric.fontFamily);
      expect(projected.tokens.font.minimumValue).toBe(
        engine.metric.minValueFontSize
      );
      expect(projected.tokens.trend.stroke).toBe(
        engine.lineSeriesStyle.line.strokeWidth
      );
      expect(projected.tokens.trend.opacity).toBe(
        engine.areaSeriesStyle.area.opacity
      );
    }
  );

  it('leaves un-authored responsive typography, spacing, alignment and contrast to Elastic Charts', () => {
    const settings = metricSettings(
      metricExamples[0]!,
      elasticChartsThemes.light
    );
    const keys = Object.keys(settings.metric);
    for (const key of [
      'valueFontSize',
      'minValueFontSize',
      'titleWeight',
      'spacing',
      'valuePosition',
      'titlesTextAlign',
      'valueTextAlign',
      'extraTextAlign',
      'iconAlign',
      'textDarkColor',
      'textLightColor',
      'textSubtitleDarkColor',
      'textExtraLightColor',
    ]) {
      expect(keys).not.toContain(key);
    }
    const custom = metricSettings(
      {
        ...metricExamples[0]!,
        layout: {
          density: 'compact',
          valueFont: 'fit',
          primaryAlign: 'center',
          primaryPosition: 'top',
        },
      },
      elasticChartsThemes.dark
    );
    expect(custom.metric).toMatchObject({
      spacing: 'small',
      valueFontSize: 'fit',
      valueTextAlign: 'center',
      valuePosition: 'top',
    });
  });

  it('uses the same host typography, spacing and colors in React, HTML and snapshot', () => {
    const baseThemes = {
      light: getChartsTheme({ name: 'amsterdam', darkMode: false }),
      dark: getChartsTheme({ name: 'amsterdam', darkMode: true }),
    };
    const tokens = createChartTokens({
      fontFamily: 'Host Sans, sans-serif',
      fontSize: 20,
      space: 6,
    });
    const tones = {
      neutral: '#555555',
      good: '#006644',
      bad: '#aa0000',
      warning: '#775500',
    };
    const themes = {
      light: projectElasticChartsTheme(
        baseThemes.light,
        'light',
        tones,
        tokens
      ),
      dark: projectElasticChartsTheme(baseThemes.dark, 'dark', tones, tokens),
    };
    expect(themes.light.tokens.tile.padding).toBe(24);
    expect(themes.light.tokens.frame.width).toBe(1200);
    expect(themes.light.tone).toEqual(tones);
    const runtime = createIsomerRuntime({
      packs: [chartsPack],
      frames: { chart: createChartFrame(themes) },
      styleAdapter: createChartsStyleAdapter(themes),
      rendererOverrides: createElasticChartsRendererOverrides(baseThemes),
    });
    const composition = { type: 'view' as const, body: [metricExamples[0]!] };
    const html = runtime.surfaces.html.render(composition, { theme: 'dark' });
    const snapshot = runtime.surfaces.snapshot.render(composition, {
      theme: 'dark',
    });
    const context = { chartTheme: themes.dark };
    const react = renderToStaticMarkup(
      runtime.surfaces.react.render(composition, { context })
    );
    for (const markup of [html.body, snapshot.html, react]) {
      expect(markup).toContain('Host Sans, sans-serif');
      expect(markup).toContain('padding:24px');
      expect(markup).toContain(themes.dark.background);
    }
    expect(snapshot.width).toBe(1200);
    expect(
      metricSettings(metricExamples[0]!, themes.dark).metric.fontFamily
    ).toBe('Host Sans, sans-serif');
  });
});
