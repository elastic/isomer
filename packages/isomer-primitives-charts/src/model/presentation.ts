/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricTiles } from './collapse';
import type { MetricTile, MetricTrendModel } from './declarations';
import { compareMetric, formatReading, formatSample } from './readings';

export interface AlignedMetricPoint {
  time: number;
  primary: number | null;
  secondary: number | null;
}

/** Join actual instants, not array positions. An absent sample remains a gap. */
export function alignMetricTrends(
  trend: NonNullable<MetricTile['trend']>
): AlignedMetricPoint[] {
  const primary = new Map(
    trend.primary.map((point) => [point.time, point.value])
  );
  const secondary = new Map(
    trend.secondary?.map((point) => [point.time, point.value]) ?? []
  );
  return [...new Set([...primary.keys(), ...secondary.keys()])]
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      primary: primary.get(time) ?? null,
      secondary: secondary.get(time) ?? null,
    }));
}

/** Tile paint wins over its palette band, then the chart fallback. Tone is independent. */
export function metricTileColor(
  node: MetricTrendModel,
  tile: MetricTile
): {
  color?: string | undefined;
  tone?: MetricTile['tone'];
  label?: string;
} {
  const palette = node.palette;
  const value = tile.primary.value;
  let match:
    NonNullable<MetricTrendModel['palette']>['bands'][number] | undefined;
  if (palette && typeof value === 'number') {
    let scaled = value;
    if (palette.scale === 'percent') {
      const domain = palette.domain!;
      scaled = ((value - domain.min) / (domain.max - domain.min)) * 100;
    }
    match = [...palette.bands]
      .reverse()
      .find((band) => band.from === undefined || scaled >= band.from);
  }
  const result: ReturnType<typeof metricTileColor> = {};
  const color = tile.color ?? match?.color ?? node.color;
  const tone = tile.tone ?? match?.tone;
  if (color) {
    result.color = color;
  }
  if (tone) {
    result.tone = tone;
  }
  if (match?.label) {
    result.label = match.label;
  }
  return result;
}

/** Include the UTC offset so repeated local times at DST transitions stay distinguishable. */
export function metricTimeLabel(
  time: number,
  zone = 'UTC',
  locale = 'en-US'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'shortOffset',
    hourCycle: 'h23',
  }).format(time);
}

function trendLines(tile: MetricTile, locale: string | undefined): string[] {
  const trend = tile.trend;
  if (!trend) {
    return [];
  }
  let labels = tile.primary.label;
  if (trend.secondary) {
    labels += `; ${tile.secondary!.label}`;
  }
  const lines = [
    `Time (${trend.timeZone ?? 'UTC'}); ${labels}; gaps: ${trend.gap ?? 'gap'}`,
  ];
  for (const point of alignMetricTrends(trend)) {
    const primary =
      point.primary === null
        ? 'gap'
        : formatSample(point.primary, tile.primary, locale);
    let line = `${metricTimeLabel(point.time, trend.timeZone, locale)}: ${primary}`;
    if (trend.secondary) {
      const secondary =
        point.secondary === null
          ? 'gap'
          : formatSample(point.secondary, tile.secondary!, locale);
      line += `; ${secondary}`;
    }
    lines.push(line);
  }
  return lines;
}

function tileText(node: MetricTrendModel, tile: MetricTile): string {
  const lines = [tile.title ?? tile.primary.label];
  if (tile.subtitle) {
    lines.push(tile.subtitle);
  }
  lines.push(
    `${tile.primary.label}: ${formatReading(tile.primary, node.locale)}`
  );
  if (tile.secondary) {
    lines.push(
      `${tile.secondary.label}: ${formatReading(tile.secondary, node.locale)}`
    );
    const compared = compareMetric(tile, node.locale);
    if (compared) {
      lines.push(`Comparison: ${compared.formatted}`, compared.description);
    }
  }
  const paint = metricTileColor(node, tile);
  if (paint.tone) {
    const label = paint.label ? ` (${paint.label})` : '';
    lines.push(`Status: ${paint.tone}${label}`);
  }
  if (tile.progress) {
    const min = formatSample(tile.progress.min ?? 0, tile.primary, node.locale);
    const max = formatSample(tile.progress.max, tile.primary, node.locale);
    lines.push(
      `${tile.progress.label ?? 'Progress'}: ${formatReading(tile.primary, node.locale)} in [${min}, ${max}]`
    );
  }
  if (tile.action) {
    lines.push(`Action: ${tile.action.label} (requires host interaction)`);
  }
  lines.push(...trendLines(tile, node.locale));
  return lines.join('\n');
}

/** Shared nonvisual adaptation. Drawing policies never fill gaps in this account of the data. */
export function metricText(node: MetricTrendModel): string {
  const blocks = [node.title];
  if (node.description !== undefined) {
    blocks.push(node.description);
  }
  if (node.collapse) {
    blocks.push(
      `${node.collapse.operation} over ${node.tiles.length} source tiles`
    );
  }
  blocks.push(...metricTiles(node).map((tile) => tileText(node, tile)));
  return blocks.join('\n\n');
}
