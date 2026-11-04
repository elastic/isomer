/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A metric Scene as Kibana's metric visualization draws it
// (`expression_metric/public/components/metric_vis.tsx`): one Elastic Charts
// `Metric` with a tile per Scene tile, every string and color from the Scene.

import type { ReactNode } from 'react';
import {
  Chart,
  Metric,
  type MetricDatum,
  type PartialTheme,
  type SecondaryMetricProps,
  Settings,
} from '@elastic/charts';
import type {
  MetricScene,
  MetricTile,
  SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { metricHandlers } from './events';
import type { ElasticChartsOptions } from './options';
import { chromeTheme, kibanaBaseTheme } from './theme';

const secondaryOf = ({
  secondary,
}: MetricTile): SecondaryMetricProps | undefined =>
  secondary === undefined
    ? undefined
    : {
        value: secondary.text,
        ...(secondary.label === undefined ? {} : { label: secondary.label }),
        labelPosition: secondary.labelPlacement,
        ...(secondary.badge === undefined
          ? { style: { color: secondary.color } }
          : {
              badgeColor: secondary.badge.color,
              badgeTextColor: secondary.color,
            }),
        badgeBorderColor: { mode: 'none' },
      };

/** The Elastic Charts datum for a tile. Its value prints the Scene's text, whatever Elastic Charts passes. */
export const metricDatum = (tile: MetricTile): MetricDatum => {
  const { progress, trend, value } = tile;
  const text = () => value.text;
  const extra = secondaryOf(tile);
  const base = {
    title: tile.title,
    ...(tile.subtitle === undefined ? {} : { subtitle: tile.subtitle }),
    ...(extra === undefined ? {} : { extra }),
    color: progress?.color ?? trend?.color ?? tile.background,
    ...(progress || trend ? { background: tile.background } : {}),
    valueColor: value.color,
  };
  const numeric = typeof value.raw === 'number' ? value.raw : undefined;
  if (progress) {
    return {
      ...base,
      value: progress.fraction,
      domainMax: 1,
      progressBarDirection: progress.orientation,
      valueFormatter: text,
    };
  }
  const datum: MetricDatum =
    numeric === undefined
      ? { ...base, value: value.text }
      : { ...base, value: numeric, valueFormatter: text };
  if (trend) {
    const points = trend.points.flatMap(({ x, y }) =>
      y === null ? [] : [{ x, y }]
    );
    return { ...datum, trend: points, trendShape: 'area' };
  }
  return datum;
};

/** Tiles in rows of `layout.columns`, as Kibana slices them. */
export const metricGrid = (
  scene: MetricScene
): (MetricDatum | undefined)[][] => {
  const { columns } = scene.layout;
  const grid: (MetricDatum | undefined)[][] = [];
  for (let at = 0; at < scene.tiles.length; at += columns) {
    grid.push(scene.tiles.slice(at, at + columns).map(metricDatum));
  }
  return grid;
};

/** The metric overrides Kibana sets on `Settings`, from the Scene's layout and chrome. */
export const metricTheme = (scene: MetricScene): PartialTheme => {
  const { layout, chrome } = scene;
  const track = scene.tiles.find(({ progress }) => progress)?.progress?.track;
  return {
    ...chromeTheme(chrome),
    metric: {
      ...(track === undefined ? {} : { barBackground: track }),
      emptyBackground: chrome.background,
      blendingBackground: chrome.background,
      titlesTextAlign: layout.labelsAlignment,
      valueTextAlign: layout.valueAlignment,
      extraTextAlign: layout.secondaryAlignment,
      iconAlign: layout.icon?.alignment ?? 'right',
      valueFontSize: layout.valueSizing === 'fill' ? 'fit' : 'default',
      spacing: layout.density === 'compact' ? 'small' : 'large',
      valuePosition: layout.valuePosition,
    },
  };
};

export const MetricChart = ({
  scene,
  env,
  options,
}: {
  scene: MetricScene;
  env: SceneRenderEnv;
  options: ElasticChartsOptions;
}): ReactNode => (
  <Chart size={scene.size ?? { width: '100%', height: '100%' }}>
    <Settings
      baseTheme={kibanaBaseTheme(scene.scheme)}
      theme={metricTheme(scene)}
      locale={scene.locale}
      debugState={options.debugState ?? false}
      {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
      ariaDescription={scene.summary}
      {...metricHandlers(scene, env)}
    />
    <Metric id="metric" data={metricGrid(scene)} />
  </Chart>
);
