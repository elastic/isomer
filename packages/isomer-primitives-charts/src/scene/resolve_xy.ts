/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { continuousScaleOf, coordinateOf } from '../coordinates';
import { toEpoch } from '../format/date';
import { DEFAULT_FORMATS } from '../format/format';
import type { Cell } from '../schema/data';
import type { PortableFormat } from '../schema/format';
import type { XyChartNode } from '../schema/xy_chart';

import {
  createResolution,
  describe,
  keyPart,
  type Resolution,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { categoricalColor, resolveColor } from './theme';
import { resolveTimeTicks } from './time_axis';
import type {
  SceneAnnotation,
  SceneAxis,
  SceneColor,
  SceneLegendItem,
  SceneReferenceLine,
  SceneSelection,
  XyCategory,
  XyMark,
  XyScene,
  XySceneLayer,
  XySeries,
} from './types';

type DataLayer = Extract<XyChartNode['layers'][number], { kind: 'data' }>;
type XScale = 'ordinal' | 'time' | 'linear';
type Statistic = NonNullable<
  NonNullable<XyChartNode['legend']>['statistics']
>[number];
type XDomainConfig = NonNullable<
  NonNullable<XyChartNode['axes']>['x']
>['domain'];

/** The largest epoch milliseconds a `Date` holds. */
const MAX_DATE = 8.64e15;

// A gap past the largest double stops at it.
const bounded = (value: number) =>
  Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, value));

/**
 * The bucket width over ascending distinct x values, as Elastic Charts'
 * `minInterval` is: the stated interval, unless it is wider than their
 * smallest spacing, which is used then, as it is when none is stated.
 */
const bucketWidthOf = (
  xs: readonly number[],
  stated: number | undefined
): number | undefined => {
  const spacing = xs.reduce<number | undefined>((smallest, x, at) => {
    if (at === 0) {
      return smallest;
    }
    const gap = bounded(x - xs[at - 1]!);
    return gap > 0 && (smallest === undefined || gap < smallest)
      ? gap
      : smallest;
  }, undefined);
  return stated === undefined ||
    stated < 0 ||
    (spacing !== undefined && stated > spacing)
    ? spacing
    : stated;
};

/**
 * A time x axis's ticks, from the domain and bucket Elastic Charts computes
 * from the drawn marks (`mergeXDomain`): the marks' extent or the custom
 * domain; their {@link bucketWidthOf}; and one bucket more where bars fill
 * buckets, as `xy.tsx` turns on histogram mode. Absent when no mark has a time.
 */
const timeTicksOf = (
  series: readonly XySeries[],
  statedInterval: number | undefined,
  {
    domain,
    locale,
    timeZone,
    maxWidth,
  }: {
    domain: XDomainConfig;
    locale: string;
    timeZone: string;
    maxWidth: number | undefined;
  }
): Pick<SceneAxis, 'timeTicks'> => {
  const xs = [
    ...new Set(
      series.flatMap(({ marks }) =>
        marks.flatMap(({ x }) =>
          typeof x === 'number' && Number.isFinite(x) ? [x] : []
        )
      )
    ),
  ].sort((a, b) => a - b);
  if (xs.length === 0) {
    return {};
  }
  const interval = bucketWidthOf(xs, statedInterval) ?? 1;
  const custom =
    domain?.kind === 'custom' && domain.min <= domain.max ? domain : undefined;
  const min = custom?.min ?? xs[0]!;
  const max = custom?.max ?? xs.at(-1)!;
  // Rasters reach a decade or a bucket past the domain, which must stay a valid `Date`.
  const reach = 2 * interval + 1e12;
  if (min - reach < -MAX_DATE || max + reach > MAX_DATE) {
    return {};
  }
  const bars = series.filter(({ mark }) => mark === 'bar');
  const extend =
    bars.length > 0 &&
    bars.some(({ stack }) => stack !== undefined || bars.length <= 1);
  return {
    timeTicks: resolveTimeTicks({
      min,
      max,
      interval,
      extend,
      locale,
      timeZone,
      ...(maxWidth === undefined ? {} : { maxWidth }),
    }),
  };
};

// Style for nodes that state none.
const DEFAULTS = {
  areaOpacity: 0.3,
  areaFill: 'gradient',
  barMinimumHeight: 1,
} as const;

const STATISTIC_NAMES: Record<Statistic, string> = {
  min: 'Min',
  max: 'Max',
  avg: 'Average',
  median: 'Median',
  range: 'Range',
  last_value: 'Last value',
  last_non_null_value: 'Last non-null value',
  first_value: 'First value',
  first_non_null_value: 'First non-null value',
  difference: 'Difference',
  difference_percentage: 'Difference %',
  count: 'Count',
  total: 'Total',
  standard_deviation: 'Std deviation',
  variance: 'Variance',
  distinct_count: 'Distinct count',
  current_and_last_value: 'Current and last value',
};

const ROTATION = { horizontal: 0, angled: -45, vertical: -90 } as const;

const rowsOf = (layer: DataLayer, total: number): number[] => {
  const [start, end] = layer.rows ?? [0, total];
  return Array.from(
    { length: Math.max(0, end - start) },
    (_, index) => start + index
  );
};

interface SeriesDraft {
  key: string;
  label: string;
  layerIndex: number;
  yIndex: number;
  layer: DataLayer;
  yColumn: string;
  axis: 'y' | 'y2';
  split?: { column: string; cell: Cell; text: string };
  rows: number[];
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[middle]!;
  }
  const low = sorted[middle - 1]!;
  const high = sorted[middle]!;
  // Halves keep a sum past the largest double finite.
  return Number.isFinite(low + high) ? (low + high) / 2 : low / 2 + high / 2;
};

// The mean and variance, in units of the largest magnitude when a sum would pass the largest double.
const moments = (values: number[]) => {
  const largest = values.reduce(
    (most, value) => Math.max(most, Math.abs(value)),
    0
  );
  const unit = Number.isFinite(
    values.reduce((sum, value) => sum + value * value, 0)
  )
    ? 1
    : largest;
  const scaled = values.map((value) => value / unit);
  const mean = scaled.reduce((sum, value) => sum + value, 0) / scaled.length;
  const variance =
    scaled.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scaled.length;
  return {
    mean: mean * unit,
    deviation: Math.sqrt(variance) * unit,
    variance: variance * unit * unit,
  };
};

const statistic = (
  name: Statistic,
  ys: (number | null)[],
  resolution: Resolution,
  yColumn: string,
  rows: number[]
): string => {
  const present = ys.filter((value): value is number => value !== null);
  const sum = present.reduce((total, value) => total + value, 0);
  const { mean, deviation, variance } = moments(present);
  const first = present[0];
  const last = present[present.length - 1];
  const value = (number: number | null | undefined) =>
    resolution.valueText(yColumn, number ?? null);
  const cellText = (index: number | undefined) =>
    index === undefined ? value(null) : resolution.text(yColumn, rows[index]!);
  const presentIndexes = ys.flatMap((y, index) => (y === null ? [] : [index]));
  switch (name) {
    case 'min':
    case 'max': {
      const selected = presentIndexes.reduce<number | undefined>(
        (best, index) =>
          best === undefined ||
          (name === 'min' ? ys[index]! < ys[best]! : ys[index]! > ys[best]!)
            ? index
            : best,
        undefined
      );
      return cellText(selected);
    }
    case 'avg':
      return value(present.length ? mean : null);
    case 'median':
      return value(present.length ? median(present) : null);
    case 'range':
      return value(
        present.length
          ? present.reduce((high, value) => Math.max(high, value), -Infinity) -
              present.reduce((low, value) => Math.min(low, value), Infinity)
          : null
      );
    case 'last_value':
      return cellText(ys.length ? ys.length - 1 : undefined);
    case 'last_non_null_value':
      return cellText(presentIndexes.at(-1));
    case 'first_value':
      return cellText(ys.length ? 0 : undefined);
    case 'first_non_null_value':
      return cellText(presentIndexes[0]);
    case 'difference':
      return value(
        first === undefined || last === undefined ? null : last - first
      );
    case 'difference_percentage':
      return resolution.formatAs(
        first === undefined || last === undefined || first === 0
          ? null
          : (last - first) / first,
        DEFAULT_FORMATS.percent
      );
    case 'count':
      return resolution.formatAs(ys.length, DEFAULT_FORMATS.number);
    case 'total':
      return value(present.length ? sum : null);
    case 'standard_deviation':
      return value(present.length ? deviation : null);
    case 'variance':
      return value(present.length ? variance : null);
    case 'distinct_count':
      return resolution.formatAs(new Set(present).size, DEFAULT_FORMATS.number);
    case 'current_and_last_value':
      return cellText(ys.length ? ys.length - 1 : undefined);
  }
};

/** The Scene of an `xyChart` node. */
export const resolveXy = (
  node: XyChartNode,
  options: ResolveChartOptions
): XyScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme, timeZone } = resolution;
  const interactions = resolveInteractions(node);
  const offers = (target: SceneSelection['target']) =>
    interactions.select.includes(target);
  const orientation = node.orientation ?? 'vertical';
  const horizontal = orientation === 'horizontal';
  const dataLayers = node.layers
    .map((layer, index) => ({ layer, index }))
    .filter(
      (entry): entry is { layer: DataLayer; index: number } =>
        entry.layer.kind === 'data'
    );

  const xId = dataLayers[0]?.layer.x;
  const xColumn = xId === undefined ? undefined : resolution.column(xId);
  const xScale: XScale = (() => {
    const scale =
      node.axes?.x?.scale ??
      (xColumn === undefined ? undefined : continuousScaleOf(xColumn.type));
    return scale === 'temporal' ? 'time' : (scale ?? 'ordinal');
  })();
  const columnFormat =
    xId === undefined ? DEFAULT_FORMATS.number : resolution.format(xId);
  // A time axis over a column with no format of its own prints dates.
  const xFormat: PortableFormat =
    xScale === 'time' && xColumn?.format === undefined
      ? DEFAULT_FORMATS.date
      : columnFormat;
  const xText = (row: number) =>
    xId === undefined
      ? ''
      : (data.display?.[xId]?.[row] ??
        resolution.formatAs(resolution.cell(xId, row), xFormat));
  const xOf = (row: number): number | string => {
    if (xId === undefined) {
      return xScale === 'ordinal' ? '' : 0;
    }
    if (xScale === 'ordinal') {
      return resolution.identity(xId, row);
    }
    const cell = resolution.cell(xId, row);
    const coordinate = coordinateOf(
      cell,
      xScale === 'time' ? 'temporal' : 'linear'
    );
    if (coordinate === undefined && cell !== null) {
      throw new RangeError(
        `Cannot resolve x column "${xId}" on a ${xScale} axis.`
      );
    }
    return coordinate ?? Number.NaN;
  };

  // Series, in layer order, then y column, then split value by first appearance.
  const drafts: SeriesDraft[] = [];
  const splitLayers = dataLayers.filter(
    ({ layer }) => layer.splitBy !== undefined
  ).length;
  for (const { layer, index } of dataLayers) {
    const rows = rowsOf(layer, data.rows.length);
    const namesY = layer.y.length > 1 || splitLayers > 1;
    for (const [yIndex, y] of layer.y.entries()) {
      const yColumn = resolution.column(y.column);
      if (layer.splitBy === undefined) {
        drafts.push({
          key: keyPart(y.column),
          label: yColumn.label,
          layerIndex: index,
          yIndex,
          layer,
          yColumn: y.column,
          axis: y.axis ?? 'y',
          rows,
        });
        continue;
      }
      const splitId = layer.splitBy;
      const groups = new Map<string, number[]>();
      for (const row of rows) {
        const key = resolution.identity(splitId, row);
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }
      for (const groupRows of groups.values()) {
        const first = groupRows[0]!;
        const value = keyPart(resolution.cell(splitId, first));
        const text = resolution.text(splitId, first);
        drafts.push({
          key: namesY ? `${keyPart(y.column)}:${value}` : value,
          label: namesY ? `${text} - ${yColumn.label}` : text,
          layerIndex: index,
          yIndex,
          layer,
          yColumn: y.column,
          axis: y.axis ?? 'y',
          split: {
            column: splitId,
            cell: resolution.cell(splitId, first),
            text,
          },
          rows: groupRows,
        });
      }
    }
  }

  const colorOf = (draft: SeriesDraft, index: number): SceneColor => {
    const colors = node.colors?.byKey;
    const byKey =
      colors && Object.hasOwn(colors, draft.key)
        ? colors[draft.key]
        : undefined;
    if (byKey) {
      return resolveColor(byKey, scheme);
    }
    const own = draft.layer.y[draft.yIndex]?.color;
    if (own && !draft.split) {
      return resolveColor(own, scheme);
    }
    return categoricalColor(index);
  };

  const hidden = new Set(node.interactions?.initial?.hiddenSeries ?? []);

  // Categories: every x position a series has data at, in axis order; ordinal ones in row order. Each lists every row at its x.
  const categoryRows = new Map<number | string, Set<number>>();
  for (const draft of drafts) {
    for (const row of draft.rows) {
      const x = xOf(row);
      if (typeof x === 'number' && Number.isNaN(x)) {
        continue;
      }
      const rows = categoryRows.get(x) ?? new Set<number>();
      rows.add(row);
      categoryRows.set(x, rows);
    }
  }
  const firstRows = new Map(
    [...categoryRows].map(([x, rows]) => [
      x,
      [...rows].reduce((first, row) => Math.min(first, row), Infinity),
    ])
  );
  const categoryKeys = [...categoryRows.keys()].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : firstRows.get(a)! - firstRows.get(b)!
  );
  const categorySelection = (rows: number[]): SceneSelection | undefined => {
    if (!offers('category') || xId === undefined || xColumn === undefined) {
      return undefined;
    }
    const value = resolution.cell(xId, rows[0]!);
    const identity = resolution.identity(xId, rows[0]!);
    // Rows at one instant can hold ISO date-times with different offsets.
    return rows.every((row) => resolution.identity(xId, row) === identity)
      ? {
          target: 'category',
          rows,
          columns: [xId],
          values: { [xId]: value },
          description: describe([[xColumn.label, xText(rows[0]!)]]),
        }
      : undefined;
  };
  const categories: XyCategory[] = categoryKeys.map((x) => {
    const rows = [...(categoryRows.get(x) ?? [])].sort((a, b) => a - b);
    const selection = categorySelection(rows);
    return { x, label: xText(rows[0]!), ...(selection ? { selection } : {}) };
  });
  const categoryOrder = new Map(categoryKeys.map((key, index) => [key, index]));
  const numericXs = categoryKeys.filter(
    (x): x is number => typeof x === 'number'
  );
  const statedInterval =
    xScale === 'ordinal' ? undefined : node.axes?.x?.interval;
  // Each layer's bucket width, which decides whether a mark's bucket crosses the queried range's end.
  const intervals = new Map(
    dataLayers.map(({ layer, index }) => {
      const xs = new Set(rowsOf(layer, data.rows.length).map(xOf));
      return [
        index,
        bucketWidthOf(
          numericXs.filter((x) => xs.has(x)),
          statedInterval
        ),
      ] as const;
    })
  );

  const partialRange = node.style?.partialBuckets
    ? [
        toEpoch(node.style.partialBuckets.from),
        toEpoch(node.style.partialBuckets.to),
      ]
    : undefined;

  const seriesDrafts = drafts.map((draft, seriesIndex) => {
    const color = colorOf(draft, seriesIndex);
    const yColumn = resolution.column(draft.yColumn);
    const ordered = draft.rows
      .filter((row) => {
        const x = xOf(row);
        return typeof x !== 'number' || !Number.isNaN(x);
      })
      .sort((a, b) => {
        const ax = xOf(a);
        const bx = xOf(b);
        return typeof ax === 'number' && typeof bx === 'number'
          ? ax - bx
          : (categoryOrder.get(ax) ?? 0) - (categoryOrder.get(bx) ?? 0);
      });
    const dims = [
      ...(xId === undefined ? [] : [xId]),
      ...(draft.split ? [draft.split.column] : []),
    ];
    const marks = ordered.map((row) => {
      const x = xOf(row);
      const y = toNumber(resolution.cell(draft.yColumn, row)) ?? null;
      const label = resolution.text(draft.yColumn, row);
      const description = describe([
        ...(xColumn === undefined
          ? []
          : [[xColumn.label, xText(row)] as const]),
        ...(draft.split
          ? [
              [
                resolution.column(draft.split.column).label,
                draft.split.text,
              ] as const,
            ]
          : []),
        [yColumn.label, label],
      ]);
      const partial =
        partialRange !== undefined &&
        typeof x === 'number' &&
        ((partialRange[0] !== undefined && x < partialRange[0]) ||
          (partialRange[1] !== undefined &&
            x + (intervals.get(draft.layerIndex) ?? 0) > partialRange[1]));
      const mark: XyMark = {
        source: { rows: [row], columns: [...dims, draft.yColumn] },
        x,
        y,
        label,
        description,
        ...(partial ? { partial } : {}),
        ...(offers('datum')
          ? {
              selection: {
                target: 'datum' as const,
                rows: [row],
                columns: dims,
                values: Object.fromEntries(
                  dims.map((id) => [id, resolution.cell(id, row)])
                ),
                description,
                series: { layer: draft.layerIndex, y: draft.yIndex },
                seriesKey: draft.key,
              },
            }
          : {}),
      };
      return mark;
    });
    return { draft, color, marks, seriesIndex };
  });

  const series: XySeries[] = seriesDrafts.map(({ draft, color, marks }) => {
    const splitLabel = draft.split
      ? resolution.column(draft.split.column).label
      : undefined;
    const description =
      draft.split && splitLabel !== undefined
        ? describe([[splitLabel, draft.split.text]])
        : draft.label;
    const columns = draft.split ? [draft.split.column] : [];
    const values = draft.split
      ? { [draft.split.column]: draft.split.cell }
      : {};
    // Rows that drew a mark; a row whose x is missing draws none.
    const rows = [...new Set(marks.flatMap(({ source }) => source.rows))].sort(
      (a, b) => a - b
    );
    return {
      series: { layer: draft.layerIndex, y: draft.yIndex },
      key: draft.key,
      label: draft.label,
      mark: draft.layer.mark,
      axis: draft.axis,
      color,
      ...(draft.layer.stack
        ? {
            stack: {
              group: `${draft.layerIndex}:${draft.axis}`,
              mode: draft.layer.stack,
            },
          }
        : {}),
      interpolation: node.style?.interpolation ?? 'linear',
      fitting: {
        kind: node.style?.fitting?.kind ?? 'none',
        emphasize: node.style?.fitting?.emphasize ?? false,
        extend: node.style?.fitting?.extend ?? 'none',
      },
      points: node.style?.points ?? 'auto',
      areaOpacity: node.style?.areaOpacity ?? DEFAULTS.areaOpacity,
      areaFill: node.style?.areaFill ?? DEFAULTS.areaFill,
      valueLabels:
        draft.layer.mark === 'bar' && (node.style?.barValueLabels ?? false),
      source: {
        rows,
        columns: [
          ...(xId === undefined ? [] : [xId]),
          ...columns,
          draft.yColumn,
        ],
      },
      ...(offers('series') && rows.length > 0
        ? {
            selection: {
              target: 'series' as const,
              rows,
              columns,
              values,
              description,
              series: { layer: draft.layerIndex, y: draft.yIndex },
              seriesKey: draft.key,
            },
          }
        : {}),
      marks,
    };
  });

  // Every y a data layer states, whether or not its rows produce a series.
  const yEntries = dataLayers.flatMap(({ layer, index }) =>
    layer.y.map(({ column, axis }, yIndex) => ({
      layer,
      layerIndex: index,
      yIndex,
      column,
      axis: axis ?? 'y',
    }))
  );
  const percentageAxis = (axis: 'y' | 'y2') => {
    const onAxis = yEntries.filter((entry) => entry.axis === axis);
    return (
      onAxis.length > 0 &&
      onAxis.every(({ layer }) => layer.stack === 'percentage')
    );
  };
  const yFormat = (axis: 'y' | 'y2'): PortableFormat => {
    const first = yEntries.find((entry) => entry.axis === axis);
    return percentageAxis(axis)
      ? DEFAULT_FORMATS.percent
      : first
        ? resolution.format(first.column)
        : DEFAULT_FORMATS.number;
  };

  const referenceLinesByLayer: SceneReferenceLine[][] = node.layers.map(
    (layer) =>
      layer.kind === 'referenceLines'
        ? layer.lines.map((line) => {
            const text =
              line.label ??
              (line.showText
                ? resolution.formatAs(
                    line.value,
                    line.format ??
                      (line.axis === 'x' ? xFormat : yFormat(line.axis ?? 'y'))
                  )
                : undefined);
            return {
              axis: line.axis ?? 'y',
              value: line.value,
              ...(text === undefined ? {} : { label: text }),
              color: line.color
                ? resolveColor(line.color, scheme)
                : chrome.text,
              ...(line.fill ? { fill: line.fill } : {}),
              ...(line.icon ? { icon: line.icon } : {}),
              strokeWidth: line.strokeWidth ?? 1,
              strokeDash: line.strokeDash ?? 'solid',
              textPosition: line.textPosition ?? 'auto',
            };
          })
        : []
  );
  const referenceLines = referenceLinesByLayer.flat();

  const yAxis = (id: 'y' | 'y2'): SceneAxis | undefined => {
    const onAxis = yEntries.filter((entry) => entry.axis === id);
    // Reference lines keep their axis even when no series is on it.
    if (
      onAxis.length === 0 &&
      !referenceLines.some((line) => line.axis === id)
    ) {
      return undefined;
    }
    const config = node.axes?.[id];
    const scale = config?.scale ?? 'linear';
    const domain = config?.domain ?? { kind: 'full' as const };
    return {
      id,
      position: horizontal
        ? id === 'y'
          ? 'bottom'
          : 'top'
        : id === 'y'
          ? 'left'
          : 'right',
      scale,
      format: yFormat(id),
      domain:
        domain.kind === 'custom'
          ? { kind: 'custom', min: domain.min, max: domain.max }
          : {
              kind: 'data',
              includeZero:
                scale !== 'log' &&
                (percentageAxis(id) ||
                  (domain.kind === 'full' &&
                    onAxis.some(
                      ({ layer }) =>
                        layer.mark === 'bar' || layer.mark === 'area'
                    ))),
              rounding: config?.rounding ?? true,
            },
      ...(config?.title === undefined ? {} : { title: config.title }),
      showTicks: config?.ticks ?? true,
      showGrid: config?.grid ?? true,
      labelRotation: ROTATION[config?.labelOrientation ?? 'horizontal'],
    };
  };

  const xConfig = node.axes?.x;
  const xTimeTicks =
    xScale === 'time' && !horizontal
      ? timeTicksOf(series, statedInterval, {
          domain: xConfig?.domain,
          locale: resolution.locale,
          timeZone:
            xFormat.kind === 'date' ? (xFormat.timeZone ?? timeZone) : timeZone,
          maxWidth: options.size?.width,
        })
      : {};
  const xAxis: SceneAxis = {
    id: 'x',
    position: horizontal ? 'left' : 'bottom',
    scale: xScale,
    format: xFormat,
    ...(xScale === 'time'
      ? {
          timeZone:
            xFormat.kind === 'date' ? (xFormat.timeZone ?? timeZone) : timeZone,
        }
      : {}),
    ...(xScale === 'ordinal'
      ? {}
      : {
          domain:
            xConfig?.domain?.kind === 'custom'
              ? {
                  kind: 'custom' as const,
                  min: xConfig.domain.min,
                  max: xConfig.domain.max,
                }
              : {
                  kind: 'data' as const,
                  includeZero: false,
                  rounding: xConfig?.rounding ?? true,
                },
        }),
    ...(statedInterval === undefined ? {} : { interval: statedInterval }),
    ...(xConfig?.title === undefined ? {} : { title: xConfig.title }),
    showTicks: xConfig?.ticks ?? true,
    showGrid: xConfig?.grid ?? true,
    // Lens's multi-layer time axis takes no `labelsOrientation`.
    labelRotation: xTimeTicks.timeTicks
      ? 0
      : ROTATION[xConfig?.labelOrientation ?? 'horizontal'],
    ...xTimeTicks,
  };

  const legendConfig = node.legend;
  const legendItems: SceneLegendItem[] = series.map((entry, index) => {
    const draft = drafts[index]!;
    const description = draft.split
      ? describe([
          [resolution.column(draft.split.column).label, draft.split.text],
        ])
      : entry.label;
    const ys = entry.marks.map(
      ({ source }) =>
        toNumber(resolution.cell(draft.yColumn, source.rows[0] ?? 0)) ?? null
    );
    return {
      series: entry.series,
      key: entry.key,
      label: entry.label,
      color: entry.color,
      hidden: hidden.has(entry.key),
      statistics: (legendConfig?.statistics ?? []).map((name) => ({
        name: STATISTIC_NAMES[name],
        value: statistic(
          name,
          ys,
          resolution,
          draft.yColumn,
          entry.marks.map(({ source }) => source.rows[0]!)
        ),
      })),
      source: entry.source,
      description,
      ...(offers('legend') && entry.source.rows.length > 0
        ? {
            selection: {
              target: 'legend' as const,
              rows: entry.source.rows,
              columns: draft.split ? [draft.split.column] : [],
              values: draft.split
                ? { [draft.split.column]: draft.split.cell }
                : {},
              description,
              series: entry.series,
              seriesKey: entry.key,
            },
          }
        : {}),
    };
  });

  const annotationsByLayer: SceneAnnotation[][] = node.layers.map((layer) =>
    layer.kind === 'annotations'
      ? layer.events.flatMap((event): SceneAnnotation[] => {
          if (event.hidden) {
            return [];
          }
          const color = event.color
            ? resolveColor(event.color, scheme)
            : chrome.textSubdued;
          const when = (value: number) =>
            resolution.formatAs(
              value,
              xScale === 'ordinal' ? DEFAULT_FORMATS.date : xFormat
            );
          if (event.kind === 'point') {
            const at = toEpoch(event.at);
            if (at === undefined) {
              return [];
            }
            return [
              {
                kind: 'point',
                at,
                ...(event.label === undefined ? {} : { label: event.label }),
                ...(event.text === undefined ? {} : { text: event.text }),
                color,
                ...(event.icon ? { icon: event.icon } : {}),
                ...(event.line ? { line: { ...event.line } } : {}),
                tooltip: {
                  header: when(at),
                  entries: event.label
                    ? [{ label: event.label, value: '' }]
                    : [],
                },
              },
            ];
          }
          const from = toEpoch(event.from);
          const to = toEpoch(event.to);
          if (from === undefined || to === undefined) {
            return [];
          }
          return [
            {
              kind: 'range',
              from,
              to,
              ...(event.label === undefined ? {} : { label: event.label }),
              color,
              fill: event.fill ?? 'inside',
              tooltip: {
                header: `${when(from)} → ${when(to)}`,
                entries: event.label ? [{ label: event.label, value: '' }] : [],
              },
            },
          ];
        })
      : []
  );

  const visibility = legendConfig?.visibility ?? 'auto';
  const allYs = series.flatMap(({ key, source }, index) => {
    const { yColumn, axis } = drafts[index]!;
    return hidden.has(key)
      ? []
      : source.rows.flatMap((row) => {
          const value = toNumber(resolution.cell(yColumn, row));
          return value === undefined
            ? []
            : [{ value, column: yColumn, axis, row }];
        });
  });
  // The summary names a y entry with a visible series, or with none at all.
  const shown = yEntries.filter(({ layerIndex, yIndex }) => {
    const own = drafts.filter(
      (draft) => draft.layerIndex === layerIndex && draft.yIndex === yIndex
    );
    return own.length === 0 || own.some(({ key }) => !hidden.has(key));
  });
  const named = shown.length ? shown : yEntries;
  const yLabels = [
    ...new Set(named.map(({ column }) => resolution.column(column).label)),
  ];
  const splitLabels = [
    ...new Set(
      named.flatMap(({ layer }) =>
        layer.splitBy === undefined
          ? []
          : [resolution.column(layer.splitBy).label]
      )
    ),
  ];
  const dimensions = [...(xColumn ? [xColumn.label] : []), ...splitLabels];
  const lowest = allYs.reduce<(typeof allYs)[number] | undefined>(
    (best, entry) =>
      best === undefined || entry.value < best.value ? entry : best,
    undefined
  );
  const highest = allYs.reduce<(typeof allYs)[number] | undefined>(
    (best, entry) =>
      best === undefined || entry.value > best.value ? entry : best,
    undefined
  );
  // Values on two axes, or printed differently, are not on one scale.
  const oneScale =
    new Set(
      allYs.map(
        ({ column, axis }) =>
          `${axis}:${JSON.stringify(resolution.format(column))}`
      )
    ).size <= 1;
  const range =
    !lowest || !highest
      ? ', with no data'
      : oneScale
        ? `, from ${resolution.text(lowest.column, lowest.row)} to ${resolution.text(highest.column, highest.row)}`
        : '';
  const sentence = `${yLabels.join(' and ')}${
    dimensions.length ? ` by ${dimensions.join(' and ')}` : ''
  }${range}.`;

  const y = yAxis('y');
  const y2 = yAxis('y2');
  const currentTime =
    node.style?.currentTime === undefined
      ? undefined
      : toEpoch(node.style.currentTime);
  const layers: XySceneLayer[] = node.layers.flatMap(
    (layer, layerIndex): XySceneLayer[] => {
      if (layer.kind === 'data') {
        return series
          .filter(({ series: source }) => source.layer === layerIndex)
          .map((series): XySceneLayer => ({ kind: 'series', series }));
      }
      if (layer.kind === 'referenceLines') {
        return (referenceLinesByLayer[layerIndex] ?? []).map(
          (line): XySceneLayer => ({ kind: 'referenceLine', line })
        );
      }
      return (annotationsByLayer[layerIndex] ?? []).map(
        (annotation): XySceneLayer => ({ kind: 'annotation', annotation })
      );
    }
  );

  return {
    kind: 'xy',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    orientation,
    axes: { x: xAxis, ...(y ? { y } : {}), ...(y2 ? { y2 } : {}) },
    categories,
    layers,
    legend: {
      visible:
        visibility === 'visible' ||
        (visibility === 'auto' && series.length > 1),
      position: legendConfig?.position ?? 'right',
      ...(legendConfig?.inside ? { inside: legendConfig.inside } : {}),
      layout: legendConfig?.layout ?? 'list',
      ...(legendConfig?.columns === undefined
        ? {}
        : { columns: legendConfig.columns }),
      maxLines: legendConfig?.maxLines ?? 1,
      size: legendConfig?.size ?? 'auto',
      ...(legendConfig?.seriesHeader === undefined
        ? {}
        : { header: legendConfig.seriesHeader }),
      items: legendItems,
    },
    barMinimumHeight: node.style?.barMinimumHeight ?? DEFAULTS.barMinimumHeight,
    ...(currentTime === undefined ? {} : { currentTime }),
  };
};
