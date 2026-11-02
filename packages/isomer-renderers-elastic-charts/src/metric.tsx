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
  type PartialTheme,
  ScaleType,
  Settings,
} from '@elastic/charts';
import {
  alignMetricTrends,
  type ChartsRenderContext,
  type ChartsTheme,
  compareMetric,
  formatMetricValue,
  METRIC_GLYPHS,
  type MetricTile,
  metricTileColor,
  type MetricTrendNode,
  metricTrendPrimitive,
  MetricView,
} from '@elastic/isomer-primitives-charts';

import {
  elasticChartsThemes,
  type ElasticChartsThemeSource,
  projectElasticChartsTheme,
} from './theme';

function TooltipLabel({
  children,
  label,
}: {
  children: React.ReactElement;
  label: string;
}) {
  return <span title={label}>{children}</span>;
}

interface SecondaryMetricFields {
  value: string;
  label?: string;
  labelPosition: 'before' | 'after' | 'tooltip';
  labelTooltip: typeof TooltipLabel;
  badgeColor?: string;
  ariaDescription?: string;
  icon?: string;
  badgeBorderColor?: { mode: 'auto' };
}

interface MetricTextFields {
  title: string;
  color: string;
  subtitle?: string;
  valueColor?: string;
  icon?: () => React.ReactElement;
  extra?: SecondaryMetricFields;
}

/** Pure adapter; numeric readings stay numeric so progress never becomes a gauge or formatted string. */
export function metricDatum(
  node: MetricTrendNode,
  tile: MetricTile,
  theme: ChartsTheme
) {
  const paint = metricTileColor(node, tile);
  const color =
    paint.color ?? (paint.tone ? theme.tone[paint.tone] : theme.accent);
  const format = (reading: MetricTile['primary']) =>
    reading.formatted ??
    formatMetricValue(reading.value, {
      ...reading.format,
      locale: reading.format?.locale ?? node.locale ?? 'en-US',
    });
  const base: MetricTextFields = {
    title: tile.title ?? tile.primary.label,
    color: node.applyColorTo === 'value' ? theme.background : color,
  };
  if (tile.subtitle) {
    base.subtitle = tile.subtitle;
  }
  if (node.applyColorTo === 'value') {
    base.valueColor = color;
  }
  if (tile.icon) {
    base.icon = () => <span>{tile.icon}</span>;
  }
  const extra = secondaryDatum(tile, node.locale, theme, format);
  if (extra) {
    base.extra = extra;
  }
  if (typeof tile.primary.value !== 'number') {
    return { ...base, value: format(tile.primary) } satisfies MetricDatum;
  }
  const numeric = {
    ...base,
    value: tile.primary.value,
    valueFormatter: (value: number) => {
      if (value === tile.primary.value) {
        return format(tile.primary);
      }
      return format({ ...tile.primary, value, formatted: undefined });
    },
  };
  if (!tile.progress) {
    return numeric satisfies MetricDatum;
  }
  return {
    ...numeric,
    domainMin: tile.progress.min ?? 0,
    domainMax: tile.progress.max,
    progressBarDirection: tile.progress.direction ?? 'horizontal',
    progressValueLabels: {
      value: tile.primary.label,
      target: tile.progress.label ?? 'Target',
    },
  } satisfies MetricDatum;
}

function secondaryDatum(
  tile: MetricTile,
  locale: string | undefined,
  theme: ChartsTheme,
  format: (reading: MetricTile['primary']) => string
): SecondaryMetricFields | undefined {
  const secondary = tile.secondary;
  if (!secondary) {
    return undefined;
  }
  const compared = compareMetric(tile, locale);
  const extra: SecondaryMetricFields = {
    value:
      secondary.comparison?.visuals === 'icon'
        ? ''
        : (compared?.formatted ?? format(secondary)),
    labelPosition:
      secondary.labelPosition === 'hidden'
        ? ('before' as const)
        : (secondary.labelPosition ?? ('before' as const)),
    labelTooltip: TooltipLabel,
  };
  if (secondary.labelPosition !== 'hidden') {
    extra.label = secondary.label;
  }
  if (secondary.color) {
    extra.badgeColor = secondary.color;
  }
  if (!compared) {
    return extra;
  }
  extra.ariaDescription = compared.description;
  if (secondary.comparison?.visuals !== 'value') {
    extra.icon = METRIC_GLYPHS[compared.direction];
  }
  extra.badgeColor = compared.color ?? theme.tone[compared.tone];
  extra.badgeBorderColor = { mode: 'auto' };
  return extra;
}

/** Application surfaces and authored settings only; sizing/contrast/typography stay with the engine. */
export function metricSettings(node: MetricTrendNode, theme: ChartsTheme) {
  const layout = node.layout;
  return {
    background: { color: theme.background },
    metric: {
      fontFamily: theme.tokens.fontFamily,
      border: theme.border,
      barBackground: theme.track,
      emptyBackground: theme.background,
      blendingBackground: theme.background,
      ...(layout?.valueFont && { valueFontSize: layout.valueFont }),
      ...(layout?.titleAlign && { titlesTextAlign: layout.titleAlign }),
      ...(layout?.primaryAlign && { valueTextAlign: layout.primaryAlign }),
      ...(layout?.secondaryAlign && { extraTextAlign: layout.secondaryAlign }),
      ...(layout?.iconAlign && { iconAlign: layout.iconAlign }),
      ...(layout?.primaryPosition && { valuePosition: layout.primaryPosition }),
      ...(layout?.density && {
        spacing: layout.density === 'compact' ? 'small' : 'large',
      }),
    },
  } satisfies PartialTheme;
}

interface TileChartProps {
  node: MetricTrendNode;
  tile: MetricTile;
  theme: ChartsTheme;
  baseTheme: ElasticChartsThemeSource;
}

function TrendChart({ node, tile, theme, baseTheme }: TileChartProps) {
  const trend = tile.trend;
  if (!trend) {
    return null;
  }
  const aligned = alignMetricTrends(trend);
  let Series: typeof LineSeries | typeof BarSeries | typeof AreaSeries =
    LineSeries;
  if (trend.shape === 'bars') {
    Series = BarSeries;
  }
  if (trend.shape === 'area') {
    Series = AreaSeries;
  }
  let label = `${tile.primary.label} over time`;
  if (trend.secondary) {
    label += ` and ${tile.secondary!.label}`;
  }
  label += `; ${trend.timeZone ?? 'UTC'}; ${trend.gap ?? 'gap'} policy`;
  return (
    <div
      data-elastic-trend=""
      style={{ height: theme.tokens.trend.height }}
      role="img"
      aria-label={label}>
      <Chart size={{ width: '100%', height: theme.tokens.trend.height }}>
        <Settings
          baseTheme={theme.mode === 'dark' ? DARK_THEME : LIGHT_THEME}
          locale={node.locale ?? 'en-US'}
          showLegend={false}
          theme={[baseTheme, { background: { color: theme.background } }]}
        />
        {(['primary', 'secondary'] as const).map((name) => {
          const reading = name === 'primary' ? tile.primary : tile.secondary;
          if (!reading || (name === 'secondary' && !trend.secondary)) {
            return null;
          }
          let points = aligned.map((point) => ({
            x: point.time,
            y: point[name] ?? (trend.gap === 'zero' ? 0 : null),
          }));
          if (trend.gap === 'connect') {
            points = points.filter((point) => point.y !== null);
          }
          return (
            <Series
              key={name}
              id={reading.label}
              data={points}
              xAccessor="x"
              yAccessors={['y']}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              timeZone={trend.timeZone ?? 'UTC'}
              yNice={false}
              color={name === 'primary' ? theme.accent : theme.secondary}
              tickFormat={(value: unknown) => {
                if (typeof value !== 'number') {
                  return String(value);
                }
                return formatMetricValue(value, {
                  ...reading.format,
                  locale: reading.format?.locale ?? node.locale ?? 'en-US',
                });
              }}
            />
          );
        })}
      </Chart>
    </div>
  );
}

function MetricTileChart(props: TileChartProps) {
  const { node, tile, theme, baseTheme } = props;
  const height =
    node.layout?.density === 'compact'
      ? theme.tokens.tile.compactHeight
      : theme.tokens.tile.height;
  return (
    <>
      <div data-elastic-metric="" style={{ height }}>
        <Chart size={{ width: '100%', height }}>
          <Settings
            baseTheme={theme.mode === 'dark' ? DARK_THEME : LIGHT_THEME}
            locale={node.locale ?? 'en-US'}
            theme={[baseTheme, metricSettings(node, theme)]}
          />
          <Metric id={tile.key} data={[[metricDatum(node, tile, theme)]]} />
        </Chart>
      </div>
      <TrendChart {...props} />
    </>
  );
}

export function MetricTrendChart({
  node,
  theme: suppliedTheme,
  baseTheme,
  context = {},
}: {
  node: MetricTrendNode;
  theme?: ChartsTheme | undefined;
  baseTheme?: ElasticChartsThemeSource | undefined;
  context?: ChartsRenderContext | undefined;
}) {
  const mode = suppliedTheme?.mode ?? 'light';
  const engineTheme = baseTheme ?? (mode === 'dark' ? DARK_THEME : LIGHT_THEME);
  const theme =
    suppliedTheme ??
    projectElasticChartsTheme(
      engineTheme,
      mode,
      elasticChartsThemes[mode].tone
    );
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <MetricView
      node={node}
      theme={theme}
      context={context}
      renderTile={
        mounted
          ? (tile) => (
              <MetricTileChart
                node={node}
                tile={tile}
                theme={theme}
                baseTheme={engineTheme}
              />
            )
          : undefined
      }
    />
  );
}

/** Replace React only; collection, parsing and nonvisual adaptations stay with the primitive. */
export function createElasticChartsRendererOverrides(baseThemes: {
  light: ElasticChartsThemeSource;
  dark: ElasticChartsThemeSource;
}) {
  return {
    metricTrend: {
      react: (
        node: MetricTrendNode,
        {
          context,
          theme = context.chartTheme,
        }: Parameters<typeof metricTrendPrimitive.renderers.react>[1]
      ) => (
        <MetricTrendChart
          node={node}
          context={context}
          theme={theme}
          baseTheme={baseThemes[theme?.mode ?? 'light']}
        />
      ),
    },
  };
}

export const elasticChartsRendererOverrides =
  createElasticChartsRendererOverrides({
    light: LIGHT_THEME,
    dark: DARK_THEME,
  });
