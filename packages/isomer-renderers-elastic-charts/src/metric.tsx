/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import {
  AreaSeries,
  BarSeries,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  LineSeries,
  Metric,
  type MetricDatum,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  alignMetricTrends,
  CHART_THEME,
  type ChartsRenderContext,
  type ChartsTheme,
  chartsThemes,
  compareMetric,
  formatMetricValue,
  metricContrast,
  type MetricTile,
  metricTileColor,
  type MetricTrendNode,
  metricTrendPrimitive,
  MetricView,
} from '@elastic/isomer-primitives-charts';

function TooltipLabel({
  children,
  label,
}: {
  children: React.ReactElement;
  label: string;
}) {
  return <span title={label}>{children}</span>;
}

/** Pure adapter, exported so hosts can inspect the exact Elastic Charts metric input. */
export function metricDatum(
  node: MetricTrendNode,
  tile: MetricTile,
  theme: ChartsTheme
) {
  const paint = metricTileColor(node, tile);
  const color =
    paint.color ?? (paint.tone ? theme.tone[paint.tone] : theme.accent);
  const compared = compareMetric(tile, node.locale);
  const secondary = tile.secondary;
  const format = (reading: MetricTile['primary']) =>
    reading.formatted ??
    formatMetricValue(reading.value, {
      ...reading.format,
      locale: reading.format?.locale ?? node.locale ?? 'en-US',
    });
  const base = {
    title: tile.title ?? tile.primary.label,
    ...(tile.subtitle ? { subtitle: tile.subtitle } : {}),
    color: node.applyColorTo !== 'value' ? color : theme.background,
    valueColor: node.applyColorTo === 'value' ? color : metricContrast(color),
    ...(tile.icon ? { icon: () => <span>{tile.icon}</span> } : {}),
    ...(secondary
      ? {
          extra: {
            value:
              secondary.comparison?.visuals === 'icon'
                ? ''
                : (compared?.formatted ?? format(secondary)),
            ...(secondary.labelPosition === 'hidden'
              ? {}
              : { label: secondary.label }),
            labelPosition:
              secondary.labelPosition === 'hidden'
                ? ('before' as const)
                : (secondary.labelPosition ?? ('before' as const)),
            labelTooltip: TooltipLabel,
            ...(compared
              ? {
                  ariaDescription: compared.description,
                  ...(secondary.comparison?.visuals === 'value'
                    ? {}
                    : { icon: CHART_THEME.glyph[compared.direction] }),
                  badgeColor: compared.color ?? theme.tone[compared.tone],
                  badgeBorderColor: { mode: 'auto' as const },
                }
              : secondary.color
                ? { badgeColor: secondary.color }
                : {}),
          },
        }
      : {}),
  };
  if (typeof tile.primary.value !== 'number') {
    return { ...base, value: format(tile.primary) } satisfies MetricDatum;
  }
  const numeric = {
    ...base,
    value: tile.primary.value,
    valueFormatter: (value: number) =>
      format(
        value === tile.primary.value
          ? tile.primary
          : { ...tile.primary, value, formatted: undefined }
      ),
  };
  return tile.progress
    ? ({
        ...numeric,
        domainMin: tile.progress.min ?? 0,
        domainMax: tile.progress.max,
        progressBarDirection: tile.progress.direction ?? 'horizontal',
        progressValueLabels: {
          value: tile.primary.label,
          target: tile.progress.label ?? 'Target',
        },
      } satisfies MetricDatum)
    : (numeric satisfies MetricDatum);
}

export function MetricTrendChart({
  node,
  theme = chartsThemes.light,
  context = {},
}: {
  node: MetricTrendNode;
  theme?: ChartsTheme | undefined;
  context?: ChartsRenderContext | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const tokens = CHART_THEME;
  return (
    <MetricView
      node={node}
      theme={theme}
      context={context}
      renderTile={
        mounted
          ? (tile) => {
              const metric = metricDatum(node, tile, theme);
              const textColor =
                node.applyColorTo === 'value'
                  ? theme.text
                  : metricContrast(metric.color);
              const height =
                node.layout?.density === 'compact'
                  ? tokens.tile.compactHeight
                  : tokens.tile.height;
              const trend = tile.trend;
              const primaryFormat = {
                ...tile.primary.format,
                locale: tile.primary.format?.locale ?? node.locale ?? 'en-US',
              };
              return (
                <>
                  <div data-elastic-metric="" style={{ height }}>
                    <Chart size={{ width: '100%', height }}>
                      <Settings
                        baseTheme={
                          theme.mode === 'dark' ? DARK_THEME : LIGHT_THEME
                        }
                        locale={node.locale ?? 'en-US'}
                        theme={{
                          background: { color: theme.background },
                          metric: {
                            fontFamily: tokens.fontFamily,
                            minHeight: height,
                            border: theme.border,
                            textDarkColor: textColor,
                            textLightColor: textColor,
                            textSubtitleDarkColor: textColor,
                            textSubtitleLightColor: textColor,
                            textExtraDarkColor: textColor,
                            textExtraLightColor: textColor,
                            barBackground: theme.track,
                            emptyBackground: theme.background,
                            blendingBackground: theme.background,
                            nonFiniteText: 'N/A',
                            valueFontSize:
                              node.layout?.valueFont === 'fit'
                                ? 'fit'
                                : tokens.font.value,
                            minValueFontSize: tokens.font.minimumValue,
                            titleWeight: tokens.font.weight,
                            titlesTextAlign: node.layout?.titleAlign ?? 'left',
                            valueTextAlign: node.layout?.primaryAlign ?? 'left',
                            extraTextAlign:
                              node.layout?.secondaryAlign ?? 'left',
                            iconAlign: node.layout?.iconAlign ?? 'left',
                            valuePosition:
                              node.layout?.primaryPosition ?? 'middle',
                            spacing:
                              node.layout?.density === 'compact'
                                ? 'small'
                                : 'large',
                          },
                        }}
                      />
                      <Metric id={tile.key} data={[[metric]]} />
                    </Chart>
                  </div>
                  {trend ? (
                    <div
                      data-elastic-trend=""
                      style={{ height: tokens.trend.height }}
                      role="img"
                      aria-label={`${tile.primary.label} over time${trend.secondary ? ` and ${tile.secondary!.label}` : ''}; ${trend.timeZone ?? 'UTC'}; ${trend.gap ?? 'gap'} policy`}>
                      <Chart
                        size={{ width: '100%', height: tokens.trend.height }}>
                        <Settings
                          baseTheme={
                            theme.mode === 'dark' ? DARK_THEME : LIGHT_THEME
                          }
                          locale={node.locale ?? 'en-US'}
                          showLegend={false}
                          theme={{
                            background: { color: theme.background },
                            lineSeriesStyle: {
                              line: { strokeWidth: tokens.trend.stroke },
                            },
                            areaSeriesStyle: {
                              area: { opacity: tokens.trend.opacity },
                            },
                          }}
                        />
                        {(['primary', 'secondary'] as const).map((name) => {
                          if (name === 'secondary' && !trend.secondary) {
                            return null;
                          }
                          const points = alignMetricTrends(trend).map(
                            (point) => ({
                              x: point.time,
                              y:
                                point[name] ??
                                (trend.gap === 'zero' ? 0 : null),
                            })
                          );
                          const Series =
                            trend.shape === 'bars'
                              ? BarSeries
                              : trend.shape === 'area'
                                ? AreaSeries
                                : LineSeries;
                          return (
                            <Series
                              key={name}
                              id={
                                name === 'primary'
                                  ? tile.primary.label
                                  : tile.secondary!.label
                              }
                              data={
                                trend.gap === 'connect'
                                  ? points.filter((p) => p.y !== null)
                                  : points
                              }
                              xAccessor="x"
                              yAccessors={['y']}
                              xScaleType={ScaleType.Time}
                              yScaleType={ScaleType.Linear}
                              timeZone={trend.timeZone ?? 'UTC'}
                              color={
                                name === 'primary'
                                  ? theme.accent
                                  : theme.secondary
                              }
                              yNice={false}
                              tickFormat={(value: unknown) =>
                                typeof value === 'number'
                                  ? formatMetricValue(
                                      value,
                                      name === 'primary'
                                        ? primaryFormat
                                        : {
                                            ...tile.secondary?.format,
                                            locale:
                                              tile.secondary?.format?.locale ??
                                              node.locale ??
                                              'en-US',
                                          }
                                    )
                                  : String(value)
                              }
                            />
                          );
                        })}
                      </Chart>
                    </div>
                  ) : null}
                </>
              );
            }
          : undefined
      }
    />
  );
}

/** Only React is replaced. Collection, parsing and every nonvisual surface stay with the primitive. */
export const elasticChartsRendererOverrides = {
  metricTrend: {
    react: (
      node: MetricTrendNode,
      {
        context,
        theme,
      }: Parameters<typeof metricTrendPrimitive.renderers.react>[1]
    ) => (
      <MetricTrendChart
        node={node}
        context={context}
        theme={theme ?? context.chartTheme}
      />
    ),
  },
};
