/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEpoch } from '../format/date';
import { DEFAULT_FORMATS } from '../format/format';
import type { Cell } from '../schema/data';
import type { PortableFormat } from '../schema/format';
import type { XyChartNode } from '../schema/xy_chart';

import {
  cellKey,
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
import {
  linearTicks,
  logTicks,
  niceDomain,
  niceLogDomain,
  niceTimeDomain,
  tickCount,
  timeTicks,
} from './ticks';
import type {
  SceneAnnotation,
  SceneAxis,
  SceneColor,
  SceneLegendItem,
  SceneReferenceLine,
  SceneSelection,
  SceneTooltip,
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

// Defaults for nodes that state none; a materializer states its source's own.
const DEFAULTS = {
  areaOpacity: 0.3,
  areaFill: 'gradient',
  barMinimumHeight: 1,
} as const;

/** Points on `auto` hide once neighbours are closer than this, in pixels. */
const POINT_MIN_DISTANCE = 20;

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
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const statistic = (
  name: Statistic,
  ys: (number | null)[],
  resolution: Resolution,
  yColumn: string
): string => {
  const present = ys.filter((value): value is number => value !== null);
  const sum = present.reduce((total, value) => total + value, 0);
  const mean = present.length ? sum / present.length : Number.NaN;
  const variance = present.length
    ? present.reduce((total, value) => total + (value - mean) ** 2, 0) /
      present.length
    : Number.NaN;
  const first = present[0];
  const last = present[present.length - 1];
  const value = (number: number | null | undefined) =>
    resolution.valueText(yColumn, number ?? null);
  switch (name) {
    case 'min':
      return value(
        present.length
          ? present.reduce((low, value) => Math.min(low, value), Infinity)
          : null
      );
    case 'max':
      return value(
        present.length
          ? present.reduce((high, value) => Math.max(high, value), -Infinity)
          : null
      );
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
      return value(ys[ys.length - 1]);
    case 'last_non_null_value':
      return value(last);
    case 'first_value':
      return value(ys[0]);
    case 'first_non_null_value':
      return value(first);
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
      return value(present.length ? Math.sqrt(variance) : null);
    case 'variance':
      return value(present.length ? variance : null);
    case 'distinct_count':
      return resolution.formatAs(new Set(present).size, DEFAULT_FORMATS.number);
    case 'current_and_last_value':
      return value(ys[ys.length - 1]);
  }
};

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

  // The x column every data layer shares, as the axis reads it.
  const xId = dataLayers.find(({ layer }) => layer.x !== undefined)?.layer.x;
  const xColumn = xId === undefined ? undefined : resolution.column(xId);
  const xScale: XScale = (() => {
    const requested = node.axes?.x?.scale;
    if (requested === 'temporal') {
      return 'time';
    }
    if (requested) {
      return requested;
    }
    if (xColumn?.type === 'date') {
      return 'time';
    }
    if (xColumn?.type === 'number') {
      return 'linear';
    }
    return 'ordinal';
  })();
  const xText = (row: number) =>
    xId === undefined ? '' : resolution.text(xId, row);
  const xOf = (row: number): number | string => {
    if (xId === undefined) {
      return '';
    }
    const cell = resolution.cell(xId, row);
    if (xScale === 'time') {
      return toEpoch(cell) ?? Number.NaN;
    }
    if (xScale === 'linear') {
      return toNumber(cell) ?? Number.NaN;
    }
    return cellKey(cell);
  };

  // Series, in layer order, then y column, then split value by first appearance.
  const drafts: SeriesDraft[] = [];
  for (const { layer, index } of dataLayers) {
    const rows = rowsOf(layer, data.rows.length);
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
        const key = cellKey(resolution.cell(splitId, row));
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }
      for (const groupRows of groups.values()) {
        const first = groupRows[0]!;
        const value = keyPart(resolution.cell(splitId, first));
        const text = resolution.text(splitId, first);
        drafts.push({
          key: layer.y.length > 1 ? `${keyPart(y.column)}:${value}` : value,
          label: layer.y.length > 1 ? `${text} - ${yColumn.label}` : text,
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
    const own = draft.layer.y.find(
      ({ column }) => column === draft.yColumn
    )?.color;
    if (own && !draft.split) {
      return resolveColor(own, scheme);
    }
    return categoricalColor(index);
  };

  // Categories: every x position with data, in axis order.
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
  const categoryKeys = [...categoryRows.keys()];
  if (xScale !== 'ordinal') {
    (categoryKeys as number[]).sort((a, b) => a - b);
  }
  const categoryLabel = (x: number | string, rows: number[]) =>
    xId === undefined
      ? ''
      : rows[0] === undefined
        ? resolution.valueText(xId, x)
        : xText(rows[0]);
  const categories: XyCategory[] = categoryKeys.map((x) => {
    const rows = [...(categoryRows.get(x) ?? [])].sort((a, b) => a - b);
    const label = categoryLabel(x, rows);
    return {
      x,
      label,
      ...(offers('category') && xId !== undefined && xColumn
        ? {
            selection: {
              target: 'category' as const,
              rows,
              columns: [xId],
              values: { [xId]: resolution.cell(xId, rows[0] ?? 0) },
              description: describe([[xColumn.label, label]]),
            },
          }
        : {}),
    };
  });
  const categoryOrder = new Map(categoryKeys.map((key, index) => [key, index]));
  const hidden = new Set(node.interactions?.initial?.hiddenSeries ?? []);
  const numericXs = categoryKeys.filter(
    (x): x is number => typeof x === 'number'
  );
  const interval = numericXs.reduce<number | undefined>(
    (smallest, x, index) => {
      if (index === 0) {
        return smallest;
      }
      const gap = x - numericXs[index - 1]!;
      return gap > 0 && (smallest === undefined || gap < smallest)
        ? gap
        : smallest;
    },
    undefined
  );

  // Stacking: positive and negative values stack separately per stack group and x.
  const stackTops = new Map<string, { positive: number; negative: number }>();
  const stackTotals = new Map<string, number>();
  const stackGroup = (draft: SeriesDraft) =>
    draft.layer.stack ? `${draft.layerIndex}:${draft.axis}` : undefined;
  for (const draft of drafts) {
    const group = stackGroup(draft);
    if (
      hidden.has(draft.key) ||
      group === undefined ||
      draft.layer.stack !== 'percentage'
    ) {
      continue;
    }
    for (const row of draft.rows) {
      const key = `${group}|${String(xOf(row))}`;
      const value = toNumber(resolution.cell(draft.yColumn, row)) ?? 0;
      stackTotals.set(key, (stackTotals.get(key) ?? 0) + Math.abs(value));
    }
  }

  const partialRange = node.style?.partialBuckets
    ? [
        toEpoch(node.style.partialBuckets.from),
        toEpoch(node.style.partialBuckets.to),
      ]
    : undefined;

  const seriesDrafts = drafts.map((draft, seriesIndex) => {
    const color = colorOf(draft, seriesIndex);
    const yColumn = resolution.column(draft.yColumn);
    const group = stackGroup(draft);
    const ordered = [...draft.rows].sort((a, b) => {
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
    const marks = ordered.flatMap((row) => {
      const x = xOf(row);
      if (typeof x === 'number' && Number.isNaN(x)) {
        return [];
      }
      const raw = toNumber(resolution.cell(draft.yColumn, row));
      let y: number | null = raw ?? null;
      let y0: number | undefined;
      if (!hidden.has(draft.key) && group !== undefined && raw !== undefined) {
        const key = `${group}|${String(x)}`;
        const scaled =
          draft.layer.stack === 'percentage'
            ? raw / (stackTotals.get(key) || 1)
            : raw;
        const tops = stackTops.get(key) ?? { positive: 0, negative: 0 };
        const side = scaled >= 0 ? 'positive' : 'negative';
        y0 = tops[side];
        y = y0 + scaled;
        tops[side] = y;
        stackTops.set(key, tops);
      }
      const label = resolution.text(draft.yColumn, row);
      const description = describe([
        ...(xColumn ? [[xColumn.label, xText(row)] as const] : []),
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
            x + (interval ?? 0) > partialRange[1]));
      const mark: Omit<XyMark, 'tooltip'> = {
        source: { rows: [row], columns: [...dims, draft.yColumn] },
        x,
        y,
        ...(y0 === undefined ? {} : { y0 }),
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
      return [mark];
    });
    return { draft, color, marks, seriesIndex };
  });

  const tooltipEntries = new Map<
    number | string,
    Array<SceneTooltip['entries'][number]>
  >();
  for (const { draft, color, marks } of seriesDrafts) {
    if (hidden.has(draft.key)) {
      continue;
    }
    for (const { x, label } of marks) {
      const entries = tooltipEntries.get(x) ?? [];
      entries.push({ label: draft.label, value: label, color });
      tooltipEntries.set(x, entries);
    }
  }
  const tooltipAt = (x: number | string, row: number): SceneTooltip => ({
    ...(xId === undefined ? {} : { header: xText(row) }),
    entries: tooltipEntries.get(x) ?? [],
  });

  const size = resolution.size;
  const xLength = size ? (horizontal ? size.height : size.width) : undefined;
  const yLength = size ? (horizontal ? size.width : size.height) : undefined;

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
    const rows = [...draft.rows].sort((a, b) => a - b);
    const points = node.style?.points ?? 'auto';
    const spacing =
      xLength === undefined || marks.length < 2
        ? undefined
        : xLength / marks.length;
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
      showPoints:
        points === 'visible' ||
        (points === 'auto' &&
          (spacing === undefined
            ? marks.length <= POINT_MIN_DISTANCE
            : spacing >= POINT_MIN_DISTANCE)),
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
      ...(offers('series')
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
      marks: marks.map((mark) => ({
        ...mark,
        tooltip: tooltipAt(mark.x, mark.source.rows[0] ?? 0),
      })),
    };
  });

  // Y axes.
  const referenceLinesByLayer: SceneReferenceLine[][] = node.layers.map(
    (layer) =>
      layer.kind === 'referenceLines'
        ? layer.lines.map((line) => {
            const text =
              line.label ??
              (line.showText
                ? resolution.formatAs(
                    line.value,
                    line.format ?? DEFAULT_FORMATS.number
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
    const onAxis = series.filter(
      (entry) => entry.axis === id && !hidden.has(entry.key)
    );
    const firstDraft = drafts.find((draft) => draft.axis === id);
    if (onAxis.length === 0) {
      return undefined;
    }
    const config = node.axes?.[id];
    const percentage = onAxis.every(
      (entry) => entry.stack?.mode === 'percentage'
    );
    const values = [
      ...onAxis.flatMap(({ marks }) =>
        marks.flatMap((mark) => [
          ...(mark.y === null ? [] : [mark.y]),
          ...(mark.y0 === undefined ? [] : [mark.y0]),
        ])
      ),
      ...referenceLines
        .filter((line) => line.axis === id)
        .map(({ value }) => value),
    ];
    const scale = config?.scale ?? 'linear';
    let low = values.length
      ? values.reduce((low, value) => Math.min(low, value), Infinity)
      : 0;
    let high = values.length
      ? values.reduce((high, value) => Math.max(high, value), -Infinity)
      : 1;
    const domain = config?.domain ?? { kind: 'full' as const };
    if (domain.kind === 'custom') {
      low = domain.min;
      high = domain.max;
    } else if (domain.kind === 'full' && scale !== 'log') {
      low = Math.min(0, low);
      high = Math.max(0, high);
    }
    if (percentage && domain.kind !== 'custom') {
      low = Math.min(0, low);
      high = Math.max(1, high);
    }
    const count = tickCount(yLength, 50, 5);
    if (scale === 'log') {
      // A log axis has no zero or negatives; keep the positive part.
      const positive = values.filter((value) => value > 0);
      low =
        low > 0
          ? low
          : positive.length
            ? positive.reduce((low, value) => Math.min(low, value), Infinity)
            : 1;
      high = high > low ? high : low * 10;
    }
    if ((config?.rounding ?? true) && domain.kind !== 'custom') {
      [low, high] =
        scale === 'log'
          ? niceLogDomain(low, high)
          : niceDomain(low, high, count);
    }
    const format: PortableFormat = percentage
      ? DEFAULT_FORMATS.percent
      : resolution.format(firstDraft!.yColumn);
    const ticks = (
      scale === 'log'
        ? logTicks(low, high, count)
        : linearTicks(low, high, count)
    ).map((value) => ({
      value,
      label: resolution.formatAs(value, format),
    }));
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
      domain: [low, high],
      ticks,
      ...(config?.title === undefined ? {} : { title: config.title }),
      showTicks: config?.ticks ?? true,
      showGrid: config?.grid ?? true,
      labelRotation: ROTATION[config?.labelOrientation ?? 'horizontal'],
    };
  };

  // The x axis.
  const xConfig = node.axes?.x;
  const xAxis: SceneAxis = (() => {
    const base = {
      id: 'x' as const,
      position: horizontal ? ('left' as const) : ('bottom' as const),
      ...(xConfig?.title === undefined ? {} : { title: xConfig.title }),
      showTicks: xConfig?.ticks ?? true,
      showGrid: xConfig?.grid ?? true,
      labelRotation: ROTATION[xConfig?.labelOrientation ?? 'horizontal'],
    };
    if (xScale === 'ordinal') {
      const labels = categories.map(({ label }) => label);
      const most =
        xLength === undefined
          ? labels.length
          : Math.max(1, Math.floor(xLength / 30));
      const every = Math.max(1, Math.ceil(labels.length / most));
      return {
        ...base,
        scale: 'ordinal',
        domain: categoryKeys.map(String),
        ticks: categories
          .filter((_, index) => index % every === 0)
          .map(({ x, label }) => ({ value: x, label })),
      };
    }
    const hasBars = series.some(({ mark }) => mark === 'bar');
    let low = numericXs.length ? numericXs[0]! : 0;
    let high = numericXs.length ? numericXs[numericXs.length - 1]! : 1;
    if (xConfig?.domain?.kind === 'custom') {
      low = xConfig.domain.min;
      high = xConfig.domain.max;
    } else if (hasBars && interval !== undefined) {
      high += interval;
    }
    const count = tickCount(xLength, 100, 5);
    if ((xConfig?.rounding ?? true) && xConfig?.domain?.kind !== 'custom') {
      [low, high] =
        xScale === 'time'
          ? niceTimeDomain(low, high, count, timeZone)
          : niceDomain(low, high, count);
    }
    const values =
      xScale === 'time'
        ? timeTicks(low, high, count, timeZone)
        : linearTicks(low, high, count);
    const format: PortableFormat =
      xId === undefined ? DEFAULT_FORMATS.number : resolution.format(xId);
    return {
      ...base,
      scale: xScale,
      domain: [low, high],
      ticks: values.map((value) => ({
        value,
        label: resolution.formatAs(value, format),
      })),
      ...(interval === undefined ? {} : { interval }),
    };
  })();

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
        value: statistic(name, ys, resolution, draft.yColumn),
      })),
      source: entry.source,
      description,
      ...(offers('legend')
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
          const time = (value: number | string) => toEpoch(value) ?? 0;
          const when = (value: number) =>
            resolution.formatAs(value, DEFAULT_FORMATS.date);
          if (event.kind === 'point') {
            const at = time(event.at);
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
          const from = time(event.from);
          const to = time(event.to);
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
  const allYs = drafts.flatMap((draft) =>
    draft.rows.flatMap((row) => {
      const value = toNumber(resolution.cell(draft.yColumn, row));
      return value === undefined ? [] : [{ value, column: draft.yColumn }];
    })
  );
  const yLabels = [
    ...new Set(drafts.map(({ yColumn }) => resolution.column(yColumn).label)),
  ];
  const splitLabels = [
    ...new Set(
      drafts.flatMap(({ split }) =>
        split ? [resolution.column(split.column).label] : []
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
  const range =
    lowest && highest
      ? `, from ${resolution.valueText(lowest.column, lowest.value)} to ${resolution.valueText(highest.column, highest.value)}`
      : ', with no data';
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
