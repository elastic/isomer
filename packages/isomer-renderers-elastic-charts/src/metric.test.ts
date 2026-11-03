/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  DARK_THEME,
  LayoutDirection,
  LIGHT_THEME,
  MetricTrendShape,
} from '@elastic/charts';
import {
  chartTokens,
  metricExamples,
  resolveMetric,
} from '@elastic/isomer-primitives-charts/model';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { NODE_ANCHOR_ATTRIBUTE } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { toDatum, toTheme } from './datum';
import { elasticChartsPack, MetricChart } from './index';

const [example, breakdown, progress, text] = metricExamples as [
  (typeof metricExamples)[number],
  (typeof metricExamples)[number],
  (typeof metricExamples)[number],
  (typeof metricExamples)[number],
];

const datums = (node: typeof example, scheme: 'light' | 'dark' = 'light') => {
  const resolved = resolveMetric(node, scheme);
  return resolved.tiles.map((tile) => toDatum(tile, resolved.tokens));
};

describe('chart tokens', () => {
  it.each([
    ['light', LIGHT_THEME],
    ['dark', DARK_THEME],
  ] as const)('match Elastic Charts’ %s metric theme', (scheme, theme) => {
    const tokens = chartTokens[scheme];
    expect({
      fontFamily: tokens.fontFamily,
      textDarkColor: tokens.onLight.title,
      textSubtitleDarkColor: tokens.onLight.subtitle,
      textExtraDarkColor: tokens.onLight.extra,
      textLightColor: tokens.onDark.title,
      textSubtitleLightColor: tokens.onDark.subtitle,
      textExtraLightColor: tokens.onDark.extra,
      border: tokens.border,
      barBackground: tokens.barBackground,
      nonFiniteText: tokens.missing,
      titleWeight: tokens.titleWeight,
      minHeight: tokens.minHeight,
      background: tokens.background,
    }).toEqual({
      fontFamily: theme.metric.fontFamily,
      textDarkColor: theme.metric.textDarkColor,
      textSubtitleDarkColor: theme.metric.textSubtitleDarkColor,
      textExtraDarkColor: theme.metric.textExtraDarkColor,
      textLightColor: theme.metric.textLightColor,
      textSubtitleLightColor: theme.metric.textSubtitleLightColor,
      textExtraLightColor: theme.metric.textExtraLightColor,
      border: theme.metric.border,
      barBackground: theme.metric.barBackground,
      nonFiniteText: theme.metric.nonFiniteText,
      titleWeight: theme.metric.titleWeight,
      minHeight: theme.metric.minHeight,
      background: theme.background.color,
    });
  });
});

describe('toDatum', () => {
  it('maps a change and a trend, keeping gaps', () => {
    const [datum] = datums(example);
    expect(datum).toMatchObject({
      title: 'Requests',
      subtitle: 'Last 24 hours',
      value: 182_340,
      color: '#0B64DD',
      trendShape: MetricTrendShape.Area,
      trendA11yTitle: 'Requests',
      extra: {
        value: '+11.10%',
        label: 'vs previous day',
        labelPosition: 'before',
        badgeColor: '#C9F3E3',
        badgeTextColor: '#09724D',
        icon: '↑',
      },
    });
    const { valueFormatter, trend } = datum as {
      valueFormatter: (v: number) => string;
      trend: { y: number }[];
    };
    expect(valueFormatter(0)).toBe('182,340');
    expect(trend[4]!.y).toBeNaN();
  });

  it('maps progress onto the bar color and domain', () => {
    expect(datums(progress, 'dark')[0]).toMatchObject({
      color: '#61A2FF',
      value: 412_316_860_416,
      domainMin: 0,
      domainMax: 549_755_813_888,
      progressBarDirection: LayoutDirection.Horizontal,
      extra: { value: '512GB', badgeColor: '#2B394F' },
    });
  });

  it('keeps a missing progress reading as an empty bar', () => {
    const [tile] = progress.tiles;
    const [datum] = datums({ ...progress, tiles: [{ ...tile!, value: null }] });
    expect(datum).toMatchObject({
      color: '#61A2FF',
      value: 0,
      domainMin: 0,
      domainMax: 549_755_813_888,
    });
    expect(datum && 'valueFormatter' in datum && datum.valueFormatter(0)).toBe(
      'N/A'
    );
  });

  it('maps text, missing and value-painted tiles', () => {
    const [country, latency] = datums(text);
    expect(country).toEqual({
      title: 'Top country',
      value: 'Portugal',
      color: '#A6EDEA',
    });
    expect(latency).toEqual({
      title: 'p99 latency',
      value: 'N/A',
      color: '#FFFFFF',
      valueColor: '#EE4C48',
      background: '#FFFFFF',
    });
  });
});

describe('toTheme', () => {
  it('maps layout and density as Lens does', () => {
    const { metric } = toTheme(
      resolveMetric({
        ...progress,
        layout: { ...progress.layout, density: 'compact' },
      })
    );
    expect(metric).toMatchObject({
      titlesTextAlign: 'center',
      valueTextAlign: 'center',
      extraTextAlign: 'center',
      valuePosition: 'middle',
      valueFontSize: 'default',
      spacing: 'small',
    });
    expect(toTheme(resolveMetric(example)).metric).toMatchObject({
      spacing: 'large',
      valueTextAlign: 'right',
    });
  });
});

describe('elasticChartsPack', () => {
  it('renders readings on the server, where Elastic Charts cannot measure', () => {
    const runtime = createIsomerRuntime({ packs: [elasticChartsPack] });
    const { html } = runtime.surfaces.html.render({
      type: 'view',
      body: [breakdown],
    });
    expect(html).toContain('<li>web-02, CPU, 81.0%</li>');
  });

  it('anchors the node when the context asks', () => {
    const runtime = createIsomerRuntime({ packs: [elasticChartsPack] });
    expect(
      renderToString(
        runtime.surfaces.react.renderNode(breakdown, {
          context: { anchors: true },
        })
      )
    ).toContain(`${NODE_ANCHOR_ATTRIBUTE}="metric"`);
  });

  it('renders readings on the server with a fixed scheme', () => {
    expect(
      renderToString(
        createElement(MetricChart, { node: breakdown, scheme: 'dark' })
      )
    ).toContain('<li>web-02, CPU, 81.0%</li>');
  });

  it('keeps every server reading in flow, unclipped', () => {
    const html = renderToString(
      createElement(MetricChart, {
        node: { ...breakdown, columns: breakdown.tiles.length },
      })
    );
    expect(html).not.toMatch(/overflow|absolute|height:\d+px/);
    expect(html.match(/<li>/g)).toHaveLength(breakdown.tiles.length);
  });
});
