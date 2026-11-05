/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEpoch } from '../format/date';
import { formatValue } from '../format/format';
import type { ColorBand } from '../schema/colors';
import type { PortableFormat } from '../schema/format';
import type { MetricNode } from '../schema/metric';

import {
  createResolution,
  describe,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { categoricalColor, resolveColor, textOn } from './theme';
import type {
  MetricScene,
  MetricTile,
  SceneColor,
  SceneSelection,
} from './types';

// Lens's metric defaults (`config_builder/transforms/charts/metric/defaults.ts`
// and `LENS_METRIC_BREAKDOWN_DEFAULT_MAX_COLUMNS`).
const DEFAULT_MAX_COLUMNS = 3;

// Kibana's secondary-metric trend glyphs (`secondary_metric_info.ts`).
const TREND_ICONS = {
  increase: '\u2191',
  decrease: '\u2193',
  neutral: '=',
} as const;
const NOT_AVAILABLE = 'N/A';

/** The band `value` falls in: `from` inclusive, `to` exclusive, the last band's `to` inclusive. */
export const bandFor = (
  bands: readonly ColorBand[],
  value: number
): ColorBand | undefined =>
  bands.find(
    ({ from, to }, index) =>
      (from === undefined || value >= from) &&
      (to === undefined ||
        value < to ||
        (index === bands.length - 1 && value === to))
  );

const withSign = (format: PortableFormat): PortableFormat =>
  format.kind === 'number' ||
  format.kind === 'percent' ||
  format.kind === 'bytes' ||
  format.kind === 'bits'
    ? { ...format, alwaysShowSign: true }
    : format;

export const resolveMetric = (
  node: MetricNode,
  options: ResolveChartOptions
): MetricScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme } = resolution;
  const valueId = node.value.column;
  const valueColumn = resolution.column(valueId);
  const breakdownId = node.breakdown?.column;
  const breakdownColumn =
    breakdownId === undefined ? undefined : resolution.column(breakdownId);
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('tile');

  const values = data.rows.map((_, row) =>
    toNumber(resolution.cell(valueId, row))
  );
  const numeric = values.filter(
    (value): value is number => value !== undefined
  );
  const lowest = Math.min(...numeric);
  const highest = Math.max(...numeric);

  const maxOf = (row: number): number | undefined =>
    node.background?.kind === 'bar'
      ? toNumber(resolution.cell(node.background.max, row))
      : undefined;

  const bandColor = (row: number): SceneColor | undefined => {
    const value = values[row];
    const bands = node.colors?.bands;
    if (value === undefined || !bands) {
      return undefined;
    }
    let position = value;
    if (node.value.bandsRange === 'percentage') {
      const max = maxOf(row);
      if (max !== undefined) {
        position = max === 0 ? 0 : (value / max) * 100;
      } else {
        position =
          highest === lowest
            ? 100
            : ((value - lowest) / (highest - lowest)) * 100;
      }
    }
    const band = bandFor(bands, position);
    return band ? resolveColor(band.color, scheme) : undefined;
  };

  const colorOf = (row: number): SceneColor | undefined => {
    const color = node.value.color;
    if (color === undefined) {
      return undefined;
    }
    return color === 'bands' ? bandColor(row) : resolveColor(color, scheme);
  };

  const tiles = data.rows.map((_, row): MetricTile => {
    const text = resolution.text(valueId, row);
    const title =
      breakdownId === undefined
        ? valueColumn.label
        : resolution.text(breakdownId, row);
    const subtitle =
      node.value.subtitle ??
      (breakdownId === undefined ? undefined : valueColumn.label);
    const color = colorOf(row);
    const onBackground =
      (node.value.applyColorTo ?? 'background') === 'background';
    const background =
      color !== undefined && onBackground ? color : chrome.background;
    const valueColor =
      color === undefined ? chrome.text : onBackground ? textOn(color) : color;

    const tooltip = [{ label: valueColumn.label, value: text }];
    let secondary: MetricTile['secondary'];
    if (node.secondary) {
      const { column, showLabel, labelPlacement, compare } = node.secondary;
      const secondaryColumn = resolution.column(column);
      const secondaryText = resolution.text(column, row);
      let shown = secondaryText;
      let badge: NonNullable<MetricTile['secondary']>['badge'];
      if (compare) {
        const raw = toNumber(resolution.cell(column, row));
        const toPrimary = compare.to === 'primary';
        const baseline = toPrimary ? values[row] : (compare.baseline ?? 0);
        const delta =
          raw === undefined || baseline === undefined
            ? Number.NaN
            : (toPrimary ? -1 : 1) * (raw - baseline);
        const direction =
          Number.isNaN(delta) || delta === 0
            ? 'neutral'
            : delta < 0
              ? 'decrease'
              : 'increase';
        const showIcon = compare.showIcon ?? true;
        if (toPrimary) {
          shown = Number.isNaN(delta)
            ? NOT_AVAILABLE
            : formatValue(delta, withSign(resolution.format(column)));
        }
        if (!(compare.showValue ?? true)) {
          shown = '';
        }
        badge = {
          direction,
          color: resolveColor(compare.colors[direction], scheme),
          showIcon,
          ...(showIcon && !Number.isNaN(delta)
            ? { icon: TREND_ICONS[direction] }
            : {}),
        };
      }
      secondary = {
        ...(showLabel ? { label: secondaryColumn.label } : {}),
        labelPlacement: labelPlacement ?? 'before',
        text: shown,
        color: node.secondary.color
          ? resolveColor(node.secondary.color, scheme)
          : chrome.textSubdued,
        ...(badge ? { badge } : {}),
      };
      tooltip.push({ label: secondaryColumn.label, value: secondaryText });
    }

    let progress: MetricTile['progress'];
    if (node.background?.kind === 'bar') {
      const max = maxOf(row);
      const value = values[row];
      progress = {
        fraction:
          max === undefined || value === undefined || max === 0
            ? 0
            : Math.min(1, Math.max(0, value / max)),
        orientation: node.background.orientation ?? 'horizontal',
        color: color ?? categoricalColor(0),
        track: chrome.gridLine,
      };
    }

    let trend: MetricTile['trend'];
    if (node.background?.kind === 'trend') {
      const trendNode = node.background;
      const trendResolution = createResolution(trendNode.data, options);
      const key =
        trendNode.breakdown !== undefined && breakdownId !== undefined
          ? resolution.cell(breakdownId, row)
          : undefined;
      const points = trendNode.data.rows
        .map((_, trendRow) => trendRow)
        .filter(
          (trendRow) =>
            trendNode.breakdown === undefined ||
            trendResolution.cell(trendNode.breakdown, trendRow) === key
        )
        .map((trendRow) => ({
          x: toEpoch(trendResolution.cell(trendNode.x, trendRow)) ?? Number.NaN,
          y: toNumber(trendResolution.cell(trendNode.y, trendRow)) ?? null,
        }))
        .filter(({ x }) => !Number.isNaN(x))
        .sort((a, b) => a.x - b.x);
      const xs = points.map(({ x }) => x);
      const ys = points.flatMap(({ y }) => (y === null ? [] : [y]));
      trend = {
        points,
        xDomain: [
          xs.length ? Math.min(...xs) : 0,
          xs.length ? Math.max(...xs) : 0,
        ],
        yDomain: [
          ys.length ? Math.min(...ys) : 0,
          ys.length ? Math.max(...ys) : 0,
        ],
        color: color ?? categoricalColor(0),
      };
    }

    const description = describe([
      ...(breakdownColumn ? [[breakdownColumn.label, title] as const] : []),
      [valueColumn.label, text],
    ]);
    const selection: SceneSelection | undefined = selectable
      ? {
          target: 'tile',
          rows: [row],
          columns: breakdownId === undefined ? [] : [breakdownId],
          values:
            breakdownId === undefined
              ? {}
              : { [breakdownId]: resolution.cell(breakdownId, row) },
          description,
        }
      : undefined;

    return {
      source: {
        rows: [row],
        columns: [
          ...(breakdownId === undefined ? [] : [breakdownId]),
          valueId,
          ...(node.secondary ? [node.secondary.column] : []),
        ],
      },
      title,
      ...(subtitle === undefined ? {} : { subtitle }),
      value: { text, raw: resolution.cell(valueId, row), color: valueColor },
      background,
      ...(secondary ? { secondary } : {}),
      ...(progress ? { progress } : {}),
      ...(trend ? { trend } : {}),
      tooltip: {
        ...(breakdownId === undefined ? {} : { header: title }),
        entries: tooltip,
      },
      description,
      ...(selection ? { selection } : {}),
    };
  });

  const columns =
    breakdownId === undefined
      ? 1
      : Math.max(
          1,
          Math.min(
            node.breakdown?.maxColumns ?? DEFAULT_MAX_COLUMNS,
            tiles.length
          )
        );
  const layout = node.layout ?? {};

  const sentence =
    tiles.length === 0
      ? `${valueColumn.label} has no data.`
      : breakdownColumn
        ? `${valueColumn.label} by ${breakdownColumn.label}: ${tiles
            .map(({ title, value }) => `${title} ${value.text}`)
            .join(', ')}.`
        : `${valueColumn.label} is ${tiles[0]!.value.text}.`;

  return {
    kind: 'metric',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    layout: {
      columns,
      rows: Math.max(1, Math.ceil(tiles.length / columns)),
      density: layout.density ?? 'default',
      valuePosition: layout.valuePosition ?? 'bottom',
      labelsAlignment: layout.labelsAlignment ?? 'left',
      valueAlignment: layout.valueAlignment ?? 'right',
      valueSizing: layout.valueSizing ?? 'auto',
      secondaryAlignment: layout.secondaryAlignment ?? 'right',
      ...(layout.icon
        ? {
            icon: {
              name: layout.icon.name,
              alignment: layout.icon.alignment ?? 'right',
            },
          }
        : {}),
    },
    tiles,
  };
};
