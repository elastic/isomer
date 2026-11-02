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
  /** Formatted secondary/comparison text; empty for icon-only display. */
  value: string;
  /** Reading name, omitted when authored hidden. */
  label?: string;
  /** Engine placement for the secondary name, default before. */
  labelPosition: 'before' | 'after' | 'tooltip';
  /** Plain-text tooltip wrapper for tooltip-positioned labels. */
  labelTooltip: typeof TooltipLabel;
  /** Explicit secondary paint or resolved comparison/status paint. */
  badgeColor?: string;
  /** Raw comparison direction/change/desirability account. */
  ariaDescription?: string;
  /** Portable direction glyph; absent for value-only comparison display. */
  icon?: string;
  /** Delegate badge border contrast to the engine. */
  badgeBorderColor?: { mode: 'auto' };
}

interface MetricTextFields {
  /** Tile title, falling back to the primary reading label. */
  title: string;
  /** Tile fill; host surface when applying authored paint to value only. */
  color: string;
  /** Optional supporting plain text. */
  subtitle?: string;
  /** Explicit headline paint for value-only mode; otherwise engine chooses contrast. */
  valueColor?: string;
  /** Text-glyph element, not a component registry lookup. */
  icon?: () => React.ReactElement;
  /** Optional independently formatted secondary reading/comparison. */
  extra?: SecondaryMetricFields;
}

/**
 * Convert a validated tile to engine metric data without mounting a chart.
 * Numeric readings stay numeric for progress; formatted text is used by the
 * value formatter, not as the arithmetic input. Missing/text/array readings
 * become display strings. Only explicit value-paint mode forces value color;
 * otherwise contrast remains the engine's responsibility.
 */
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
    /** Raw finite reading retained for engine progress calculations. */
    value: tile.primary.value,
    /** Headline honors host text; other values use the reading's numeric format. */
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
    /** Authored lower bound, default zero. */
    domainMin: tile.progress.min ?? 0,
    /** Authored upper bound; input validation guarantees an increasing finite span. */
    domainMax: tile.progress.max,
    /** Authored progress orientation, default horizontal. */
    progressBarDirection: tile.progress.direction ?? 'horizontal',
    /** Accessible names for current reading and progress target. */
    progressValueLabels: {
      /** Primary reading label. */
      value: tile.primary.label,
      /** Authored target label, default Target. */
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

/**
 * Render a validated metric/trend node with Elastic Charts after client mount.
 * Server/initial output uses the shared baseline React/SVG tree; summaries,
 * timestamp tables and explicit host action buttons survive the transition.
 * No Lens mapping, fetching, validation or backend execution is performed.
 * @param props - `node` must pass metricTrendSchema. Optional `theme` supplies
 * portable presentation and scheme (otherwise light); `baseTheme` supplies the
 * matching resolved engine theme (otherwise the engine's default for that
 * scheme). Without `theme`, its portable projection uses standalone tone colors.
 * Supply both for custom/dark hosts: baseTheme alone does not infer a dark mode.
 * Optional `context` supplies host events/anchors and defaults to empty.
 */
export function MetricTrendChart({
  node,
  theme: suppliedTheme,
  baseTheme,
  context = {},
}: {
  /** Already validated resolved metric/trend node. */
  node: MetricTrendNode;
  /** Portable presentation and scheme; defaults to a light engine projection. */
  theme?: ChartsTheme | undefined;
  /** Matching resolved engine theme; supplying this alone does not select dark mode. */
  baseTheme?: ElasticChartsThemeSource | undefined;
  /** Optional host event/anchor context; defaults empty. */
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

/**
 * Bind React-only runtime overrides to a host-resolved light/dark engine pair.
 * The dispatched portable theme (or context.chartTheme) selects the scheme;
 * absent either, light is used. Pair this with the matching portable themes in
 * the frame/style adapter. Collection, parsing and nonvisual adaptations remain
 * with the primitive; supplied engine themes are not mutated.
 */
export function createElasticChartsRendererOverrides(baseThemes: {
  /** Host light engine theme matching its portable light projection. */
  light: ElasticChartsThemeSource;
  /** Host dark engine theme matching its portable dark projection. */
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

/**
 * React overrides bound to installed Elastic Charts light/dark defaults.
 * Host applications with custom engine themes should use the factory instead.
 */
export const elasticChartsRendererOverrides =
  createElasticChartsRendererOverrides({
    light: LIGHT_THEME,
    dark: DARK_THEME,
  });
