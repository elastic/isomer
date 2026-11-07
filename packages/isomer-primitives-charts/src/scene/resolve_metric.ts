/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scalarOf } from '../coordinates';
import { toEpoch } from '../format/date';
import type { ColorBand } from '../schema/colors';
import type { PortableFormat } from '../schema/format';
import type { MetricNode } from '../schema/metric';

import {
  cellKey,
  createResolution,
  describe,
  keyPart,
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

// Defaults for nodes that state none; a materializer states its source's own.
const DEFAULT_MAX_COLUMNS = 3;

const TREND_ICONS = {
  increase: '\u2191',
  decrease: '\u2193',
  neutral: '=',
} as const;
const NOT_AVAILABLE = 'N/A';

// The band `value` falls in: `from` inclusive, `to` exclusive.
const bandFor = (
  bands: readonly ColorBand[],
  value: number
): ColorBand | undefined =>
  bands.find(
    ({ from, to }) =>
      (from === undefined || value >= from) && (to === undefined || value < to)
  );

const withSign = (format: PortableFormat): PortableFormat =>
  format.kind === 'date' || format.kind === 'text'
    ? format
    : { ...format, signDisplay: 'exceptZero' };

/** The Scene of a `metric` node. */
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
  const lowest = numeric.reduce((low, value) => Math.min(low, value), Infinity);
  const highest = numeric.reduce(
    (high, value) => Math.max(high, value),
    -Infinity
  );

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
      const colors = node.colors?.byKey;
      const key =
        breakdownId === undefined
          ? undefined
          : keyPart(resolution.cell(breakdownId, row));
      const byKey =
        colors && key !== undefined && Object.hasOwn(colors, key)
          ? colors[key]
          : undefined;
      return byKey === undefined ? undefined : resolveColor(byKey, scheme);
    }
    return color === 'bands' ? bandColor(row) : resolveColor(color, scheme);
  };

  const trends = new Map<
    string,
    NonNullable<MetricTile['trend']>['points'][number][]
  >();
  if (node.background?.kind === 'trend') {
    const { data: trendData, x, y, breakdown } = node.background;
    const trendResolution = createResolution(trendData, options);
    trendData.rows.forEach((_, row) => {
      const epoch = toEpoch(scalarOf(trendResolution.cell(x, row)));
      if (epoch === undefined) {
        return;
      }
      const key =
        breakdown === undefined
          ? ''
          : cellKey(trendResolution.cell(breakdown, row));
      const points = trends.get(key) ?? [];
      points.push({
        x: epoch,
        y: toNumber(trendResolution.cell(y, row)) ?? null,
      });
      trends.set(key, points);
    });
    for (const points of trends.values()) {
      points.sort((a, b) => a.x - b.x);
    }
  }

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
      color === undefined
        ? chrome.text
        : onBackground
          ? textOn(color, chrome.background)
          : color;

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
            : resolution.formatAs(delta, withSign(resolution.format(column)));
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
        color:
          color !== undefined && onBackground
            ? textOn(background, chrome.background)
            : (color ?? categoricalColor(0)),
        track: chrome.gridLine,
      };
    }

    let trend: MetricTile['trend'];
    if (node.background?.kind === 'trend') {
      const key =
        node.background.breakdown === undefined
          ? ''
          : cellKey(
              breakdownId === undefined
                ? null
                : resolution.cell(breakdownId, row)
            );
      const points = trends.get(key) ?? [];
      const xs = points.map(({ x }) => x);
      const ys = points.flatMap(({ y }) => (y === null ? [] : [y]));
      trend = {
        points,
        xDomain: [
          xs.length
            ? xs.reduce((low, value) => Math.min(low, value), Infinity)
            : 0,
          xs.length
            ? xs.reduce((high, value) => Math.max(high, value), -Infinity)
            : 0,
        ],
        yDomain: [
          ys.length
            ? ys.reduce((low, value) => Math.min(low, value), Infinity)
            : 0,
          ys.length
            ? ys.reduce((high, value) => Math.max(high, value), -Infinity)
            : 0,
        ],
        color:
          color !== undefined && onBackground
            ? textOn(background, chrome.background)
            : (color ?? categoricalColor(0)),
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
