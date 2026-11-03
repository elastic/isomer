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
import { getComputed } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import {
  chartTokens,
  metricExamples,
  resolveMetric,
} from '@elastic/isomer-primitives-charts/model';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { NODE_ANCHOR_ATTRIBUTE } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { tileAction, toDatum, toTheme } from './datum';
import { elasticChartsPack, MetricChart } from './index';

/** The example whose first tile has `key`. */
const byKey = (key: string) =>
  metricExamples.find(({ tiles }) => tiles[0]?.key === key)!;

const example = byKey('requests');
const breakdown = byKey('web-01');
const progress = byKey('disk');
const text = byKey('top-country');

const datums = (node: typeof example, scheme: 'light' | 'dark' = 'light') => {
  const resolved = resolveMetric(node, scheme);
  return resolved.tiles.map((tile) => toDatum(tile, resolved.tokens));
};

describe('default colors', () => {
  it.each([
    ['light', 'LIGHT'],
    ['dark', 'DARK'],
  ] as const)("match Lens's euiColorVis2 in %s", (scheme, mode) => {
    const { euiColorVis2 } = getComputed(EuiThemeBorealis, {}, mode).colors.vis;
    expect(chartTokens[scheme].progress).toBe(euiColorVis2);
  });
});

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
  it('maps a number with the resolved reading as its formatter', () => {
    const [datum] = datums(example);
    expect(datum).toMatchObject({
      title: 'Requests',
      subtitle: 'Last 24 hours',
      value: 182_340,
      color: '#0B64DD',
    });
    const { valueFormatter } = datum as {
      valueFormatter: (v: number) => string;
    };
    expect(valueFormatter(0)).toBe('182,340');
  });

  it('maps a change onto the secondary metric', () => {
    expect(datums(example)[0]).toMatchObject({
      extra: {
        value: '+11.10%',
        label: 'vs previous day',
        labelPosition: 'before',
        badgeColor: '#C9F3E3',
        badgeTextColor: '#09724D',
        icon: '↑',
      },
    });
  });

  it('maps a trend, keeping gaps', () => {
    const [datum] = datums(example);
    expect(datum).toMatchObject({
      trendShape: MetricTrendShape.Area,
      trendA11yTitle: 'Requests',
    });
    expect((datum as { trend: { y: number }[] }).trend[4]!.y).toBeNaN();
  });

  it('keeps a trend tile with one point, which Elastic Charts draws without a line', () => {
    const [datum] = datums({
      type: 'metric',
      tiles: [
        {
          key: 'a',
          value: 3,
          color: 'primary',
          visual: { kind: 'trend', points: [{ x: 0, y: 3 }] },
        },
      ],
    });
    expect(datum).toMatchObject({ color: '#0B64DD', trend: [{ x: 0, y: 3 }] });
  });

  it('maps progress onto the bar color and domain', () => {
    expect(datums(progress, 'dark')[0]).toMatchObject({
      color: '#61A2FF',
      value: 412_316_860_416,
      domainMax: 549_755_813_888,
      progressBarDirection: LayoutDirection.Horizontal,
      extra: { value: '512GB', badgeColor: '#2B394F' },
    });
    expect(datums(progress)[0]).not.toHaveProperty('domainMin');
  });

  it('passes a nonzero min, which Elastic Charts labels as value and target', () => {
    const [tile] = progress.tiles;
    const [datum] = datums({
      ...progress,
      tiles: [{ ...tile!, visual: { kind: 'progress', min: 10, max: 10 } }],
    });
    expect(datum).toMatchObject({ domainMin: 10, domainMax: 10 });
  });

  it('keeps a missing progress reading as an empty bar', () => {
    const [tile] = progress.tiles;
    const [datum] = datums({ ...progress, tiles: [{ ...tile!, value: null }] });
    expect(datum).toMatchObject({
      color: '#61A2FF',
      value: Number.NaN,
      domainMax: 549_755_813_888,
    });
    expect(datum && 'valueFormatter' in datum && datum.valueFormatter(0)).toBe(
      'N/A'
    );
  });

  it('keeps a missing reading empty on an empty progress range too', () => {
    const [datum] = datums({
      type: 'metric',
      tiles: [
        { key: 'a', value: null, visual: { kind: 'progress', min: 5, max: 5 } },
      ],
    });
    expect(datum).toMatchObject({
      value: Number.NaN,
      domainMin: 5,
      domainMax: 5,
    });
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

describe('tileAction', () => {
  it('raises a tile’s action and nothing for a tile without one', () => {
    const [first, second] = breakdown.tiles;
    const { action: _omitted, ...inert } = second!;
    const resolved = resolveMetric({ ...breakdown, tiles: [first!, inert] });
    const click = (columnIndex: number) =>
      tileAction(resolved, [
        { type: 'metricElementEvent', rowIndex: 0, columnIndex },
      ]);
    expect(click(0)).toEqual({
      name: 'dashboard/filter',
      context: {
        key: 'web-01',
        filters: [{ field: 'host.name', value: 'web-01' }],
      },
    });
    expect(click(1)).toBeUndefined();
  });
});

describe('toTheme', () => {
  it('maps layout and density as Lens does', () => {
    const { metric } = toTheme(
      resolveMetric({
        ...text,
        layout: {
          titleAlign: 'center',
          valueAlign: 'center',
          secondaryAlign: 'center',
          valuePosition: 'middle',
          density: 'compact',
        },
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
      body: [text],
    });
    expect(html).toContain('<li>p99 latency, N/A</li>');
  });

  it('anchors the node when the context asks', () => {
    const runtime = createIsomerRuntime({ packs: [elasticChartsPack] });
    expect(
      renderToString(
        runtime.surfaces.react.renderNode(text, {
          context: { anchors: true },
        })
      )
    ).toContain(`${NODE_ANCHOR_ATTRIBUTE}="metric"`);
  });

  it('renders readings on the server with a fixed scheme', () => {
    expect(
      renderToString(createElement(MetricChart, { node: text, scheme: 'dark' }))
    ).toContain('<li>p99 latency, N/A</li>');
  });

  it('keeps every server reading in flow, unclipped', () => {
    const html = renderToString(
      createElement(MetricChart, {
        node: { ...text, columns: text.tiles.length },
      })
    );
    expect(html).not.toMatch(/overflow|absolute|height:\d+px/);
    expect(html.match(/<li>/g)).toHaveLength(text.tiles.length);
  });
});
