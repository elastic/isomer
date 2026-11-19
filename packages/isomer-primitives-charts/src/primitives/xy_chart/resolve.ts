/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { continuousScaleOf, coordinateOf } from '../../coordinates';
import { DEFAULT_FORMATS, toEpoch } from '../../format';
import {
  createResolution,
  describe,
  keyPart,
  LABEL_ROTATION,
  NO_RESULTS,
  type Resolution,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from '../../resolve';
import type {
  SceneColor,
  SceneInteractions,
  SceneSelection,
} from '../../scene';
import type { Cell, ChartColumn, PortableFormat } from '../../schema';
import { categoricalColor, keyColor, resolveColor } from '../../theme';

import type {
  SceneAnnotation,
  SceneAxis,
  SceneLegendItem,
  SceneReferenceLine,
  XyCategory,
  XyMark,
  XyScene,
  XySceneLayer,
  XySeries,
} from './scene';
import type { XyChartNode } from './schema';
import { legendStatistics } from './statistics';

type DataLayer = Extract<XyChartNode['layers'][number], { kind: 'data' }>;
type XScale = 'ordinal' | 'time' | 'linear';
type YAxisId = 'y' | 'y2';

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
    const gap = x - xs[at - 1]!;
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

// Elastic Charts' coarsest time raster, of which an axis draws at most 50 (`MAX_TIME_TICK_COUNT`).
const DECADE = 10 * 365.25 * 86_400_000;
// Elastic Charts lets a bucket run this much wider than a raster's interval, so calendar decades fit.
const WIDTH_FUDGE = 1.05;

/**
 * Whether Elastic Charts' time rasters can label an axis over these ascending
 * x times: its bucket is known and within a decade, and it spans no more than
 * 50 decades, one bucket past the last x where bars fill buckets.
 */
const rastersFit = (
  xs: readonly number[],
  stated: number | undefined,
  domain: NonNullable<NonNullable<XyChartNode['axes']>['x']>['domain'],
  fillsBuckets: boolean
): boolean => {
  const bucket = bucketWidthOf(xs, stated);
  if (
    xs.length === 0 ||
    bucket === undefined ||
    bucket / WIDTH_FUDGE > DECADE
  ) {
    return false;
  }
  const custom =
    domain?.kind === 'custom' && domain.min <= domain.max ? domain : undefined;
  const max = (custom?.max ?? xs.at(-1)!) + (fillsBuckets ? bucket : 0);
  return max - (custom?.min ?? xs[0]!) <= 50 * DECADE;
};

// Style for nodes that state none.
const DEFAULTS = {
  areaOpacity: 0.3,
  areaFill: 'gradient',
  barMinimumHeight: 1,
} as const;

const rowsOf = (layer: DataLayer, total: number): number[] => {
  const [start, end] = layer.rows ?? [0, total];
  return Array.from(
    { length: Math.max(0, end - start) },
    (_, index) => start + index
  );
};

/** The x column every data layer shares, read on the x axis's scale. */
interface XDimension {
  readonly id: string | undefined;
  readonly column: ChartColumn | undefined;
  readonly scale: XScale;
  readonly format: PortableFormat;
  /** The interval the node states for a continuous axis. */
  readonly interval: number | undefined;
  readonly text: (row: number) => string;
  /** A row's position: its identity on an ordinal axis, else its coordinate, or `NaN` when missing. */
  readonly of: (row: number) => number | string;
}

/** A y column a data layer states, whether or not its rows produce a series. */
interface YEntry {
  readonly layer: DataLayer;
  readonly layerIndex: number;
  readonly yIndex: number;
  readonly column: string;
  readonly axis: YAxisId;
}

/** What every step of {@link resolveXy} reads. */
interface XyContext {
  readonly node: XyChartNode;
  readonly resolution: Resolution;
  readonly horizontal: boolean;
  readonly dataLayers: readonly { layer: DataLayer; index: number }[];
  readonly x: XDimension;
  readonly yEntries: readonly YEntry[];
  readonly hidden: ReadonlySet<string>;
  readonly interactions: SceneInteractions;
  readonly offers: (target: SceneSelection['target']) => boolean;
}

interface SeriesDraft {
  key: string;
  label: string;
  layerIndex: number;
  yIndex: number;
  layer: DataLayer;
  yColumn: string;
  axis: YAxisId;
  split?: { column: string; label: string; cell: Cell; text: string };
  rows: number[];
}

/** A series as drawn, with the description its series and legend selections read. */
interface ResolvedSeries {
  readonly draft: SeriesDraft;
  readonly description: string;
  readonly series: XySeries;
}

const xDimensionOf = (
  node: XyChartNode,
  resolution: Resolution,
  firstLayer: DataLayer | undefined
): XDimension => {
  const { data } = resolution;
  const id = firstLayer?.x;
  const column = id === undefined ? undefined : resolution.column(id);
  const scale: XScale = (() => {
    const stated =
      node.axes?.x?.scale ??
      (column === undefined ? undefined : continuousScaleOf(column.type));
    return stated === 'temporal' ? 'time' : (stated ?? 'ordinal');
  })();
  const columnFormat =
    id === undefined ? DEFAULT_FORMATS.number : resolution.format(id);
  // A time axis over a column with no format of its own prints dates.
  const format: PortableFormat =
    scale === 'time' && column?.format === undefined
      ? DEFAULT_FORMATS.date
      : columnFormat;
  return {
    id,
    column,
    scale,
    format,
    interval: scale === 'ordinal' ? undefined : node.axes?.x?.interval,
    text: (row) =>
      id === undefined
        ? ''
        : (data.display?.[id]?.[row] ??
          resolution.formatAs(resolution.cell(id, row), format)),
    of: (row) => {
      if (id === undefined) {
        return scale === 'ordinal' ? '' : 0;
      }
      if (scale === 'ordinal') {
        return resolution.identity(id, row);
      }
      const cell = resolution.cell(id, row);
      const coordinate = coordinateOf(
        cell,
        scale === 'time' ? 'temporal' : 'linear'
      );
      if (coordinate === undefined && cell !== null) {
        throw new RangeError(
          `Cannot resolve x column "${id}" on a ${scale} axis.`
        );
      }
      return coordinate ?? Number.NaN;
    },
  };
};

const xyContext = (
  node: XyChartNode,
  options: ResolveChartOptions
): XyContext => {
  const resolution = createResolution(node.data, options);
  const interactions = resolveInteractions(node);
  const dataLayers = node.layers
    .map((layer, index) => ({ layer, index }))
    .filter(
      (entry): entry is { layer: DataLayer; index: number } =>
        entry.layer.kind === 'data'
    );
  return {
    node,
    resolution,
    horizontal: node.orientation === 'horizontal',
    dataLayers,
    x: xDimensionOf(node, resolution, dataLayers[0]?.layer),
    yEntries: dataLayers.flatMap(({ layer, index }) =>
      layer.y.map(({ column, axis }, yIndex) => ({
        layer,
        layerIndex: index,
        yIndex,
        column,
        axis: axis ?? 'y',
      }))
    ),
    hidden: new Set(node.interactions?.initial?.hiddenSeries ?? []),
    interactions,
    offers: (target) => interactions.select.includes(target),
  };
};

/** Series, in layer order, then y column, then split value by first appearance. */
const draftSeries = ({ resolution, dataLayers }: XyContext): SeriesDraft[] => {
  const drafts: SeriesDraft[] = [];
  const splitLayers = dataLayers.filter(
    ({ layer }) => layer.splitBy !== undefined
  ).length;
  for (const { layer, index } of dataLayers) {
    const rows = rowsOf(layer, resolution.data.rows.length);
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
            label: resolution.column(splitId).label,
            cell: resolution.cell(splitId, first),
            text,
          },
          rows: groupRows,
        });
      }
    }
  }
  return drafts;
};

/** Every x position a series has data at, in axis order; ordinal ones in row order. Each lists every row at its x. */
const resolveCategories = (
  { resolution, x, offers }: XyContext,
  drafts: readonly SeriesDraft[]
) => {
  const categoryRows = new Map<number | string, Set<number>>();
  for (const draft of drafts) {
    for (const row of draft.rows) {
      const at = x.of(row);
      if (typeof at === 'number' && Number.isNaN(at)) {
        continue;
      }
      const rows = categoryRows.get(at) ?? new Set<number>();
      rows.add(row);
      categoryRows.set(at, rows);
    }
  }
  const firstRows = new Map(
    [...categoryRows].map(([at, rows]) => [
      at,
      [...rows].reduce((first, row) => Math.min(first, row), Infinity),
    ])
  );
  const keys = [...categoryRows.keys()].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : firstRows.get(a)! - firstRows.get(b)!
  );
  const selectionOf = (rows: number[]): SceneSelection | undefined => {
    const { id, column } = x;
    if (!offers('category') || id === undefined || column === undefined) {
      return undefined;
    }
    const value = resolution.cell(id, rows[0]!);
    const identity = resolution.identity(id, rows[0]!);
    // Rows at one instant can hold ISO date-times with different offsets.
    return rows.every((row) => resolution.identity(id, row) === identity)
      ? {
          target: 'category',
          rows,
          columns: [id],
          values: { [id]: value },
          description: describe([[column.label, x.text(rows[0]!)]]),
        }
      : undefined;
  };
  const categories: XyCategory[] = keys.map((at) => {
    const rows = [...(categoryRows.get(at) ?? [])].sort((a, b) => a - b);
    const selection = selectionOf(rows);
    return {
      x: at,
      label: x.text(rows[0]!),
      ...(selection ? { selection } : {}),
    };
  });
  return {
    categories,
    order: new Map(keys.map((key, index) => [key, index])),
    numericXs: keys.filter((at): at is number => typeof at === 'number'),
  };
};

/** Whether a mark at `x` on the layer at `layerIndex` falls in a partial bucket. */
const partialBucketOf = (
  { node, resolution, dataLayers, x }: XyContext,
  numericXs: readonly number[]
): ((at: number | string, layerIndex: number) => boolean) => {
  // Each layer's bucket width, which decides whether a mark's bucket crosses the queried range's end.
  const intervals = new Map(
    dataLayers.map(({ layer, index }) => {
      const xs = new Set(rowsOf(layer, resolution.data.rows.length).map(x.of));
      return [
        index,
        bucketWidthOf(
          numericXs.filter((at) => xs.has(at)),
          x.interval
        ),
      ] as const;
    })
  );
  const range = node.style?.partialBuckets
    ? [
        toEpoch(node.style.partialBuckets.from),
        toEpoch(node.style.partialBuckets.to),
      ]
    : undefined;
  return (at, layerIndex) =>
    range !== undefined &&
    typeof at === 'number' &&
    ((range[0] !== undefined && at < range[0]) ||
      (range[1] !== undefined &&
        at + (intervals.get(layerIndex) ?? 0) > range[1]));
};

const colorOf = (
  { node, resolution }: XyContext,
  draft: SeriesDraft,
  index: number
): SceneColor => {
  const byKey = keyColor(node.colors?.byKey, draft.key, resolution.scheme);
  if (byKey) {
    return byKey;
  }
  const own = draft.layer.y[draft.yIndex]?.color;
  if (own && !draft.split) {
    return resolveColor(own, resolution.scheme);
  }
  return categoricalColor(index);
};

const marksOf = (
  { resolution, x, offers }: XyContext,
  draft: SeriesDraft,
  order: ReadonlyMap<number | string, number>,
  isPartial: (at: number | string, layerIndex: number) => boolean
): XyMark[] => {
  const yLabel = resolution.column(draft.yColumn).label;
  const ordered = draft.rows
    .filter((row) => {
      const at = x.of(row);
      return typeof at !== 'number' || !Number.isNaN(at);
    })
    .sort((a, b) => {
      const ax = x.of(a);
      const bx = x.of(b);
      return typeof ax === 'number' && typeof bx === 'number'
        ? ax - bx
        : (order.get(ax) ?? 0) - (order.get(bx) ?? 0);
    });
  const dims = [
    ...(x.id === undefined ? [] : [x.id]),
    ...(draft.split ? [draft.split.column] : []),
  ];
  return ordered.map((row) => {
    const at = x.of(row);
    const y = toNumber(resolution.cell(draft.yColumn, row)) ?? null;
    const label = resolution.text(draft.yColumn, row);
    const description = describe([
      ...(x.column === undefined
        ? []
        : [[x.column.label, x.text(row)] as const]),
      ...(draft.split ? [[draft.split.label, draft.split.text] as const] : []),
      [yLabel, label],
    ]);
    const partial = isPartial(at, draft.layerIndex);
    const mark: XyMark = {
      source: { rows: [row], columns: [...dims, draft.yColumn] },
      x: at,
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
};

/** The columns and values a series' or legend item's selection names: its split, if any. */
const splitSelection = ({ split }: SeriesDraft) => ({
  columns: split ? [split.column] : [],
  values: split ? { [split.column]: split.cell } : {},
});

const toSeries = (
  { node, x, offers }: XyContext,
  draft: SeriesDraft,
  color: SceneColor,
  description: string,
  marks: XyMark[]
): XySeries => {
  const { columns, values } = splitSelection(draft);
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
        ...(x.id === undefined ? [] : [x.id]),
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
};

const toLegendItem = (
  { node, resolution, hidden, offers }: XyContext,
  { draft, description, series }: ResolvedSeries
): SceneLegendItem => {
  const { marks, source } = series;
  return {
    series: series.series,
    key: series.key,
    label: series.label,
    color: series.color,
    hidden: hidden.has(series.key),
    statistics: legendStatistics(
      node.legend?.statistics ?? [],
      marks.map(({ y }) => y),
      resolution,
      draft.yColumn,
      marks.map(({ source }) => source.rows[0]!)
    ),
    source,
    description,
    ...(offers('legend') && source.rows.length > 0
      ? {
          selection: {
            target: 'legend' as const,
            rows: source.rows,
            ...splitSelection(draft),
            description,
            series: series.series,
            seriesKey: series.key,
          },
        }
      : {}),
  };
};

const percentageAxis = (yEntries: readonly YEntry[], axis: YAxisId) => {
  const onAxis = yEntries.filter((entry) => entry.axis === axis);
  return (
    onAxis.length > 0 &&
    onAxis.every(({ layer }) => layer.stack === 'percentage')
  );
};

const yFormatOf = (
  { resolution, yEntries }: XyContext,
  axis: YAxisId
): PortableFormat => {
  const first = yEntries.find((entry) => entry.axis === axis);
  return percentageAxis(yEntries, axis)
    ? DEFAULT_FORMATS.percent
    : first
      ? resolution.format(first.column)
      : DEFAULT_FORMATS.number;
};

/** Each layer's reference lines; empty for a layer of another kind. */
const referenceLinesOf = (context: XyContext): SceneReferenceLine[][] => {
  const { node, resolution, x } = context;
  return node.layers.map((layer) =>
    layer.kind === 'referenceLines'
      ? layer.lines.map((line) => {
          const text =
            line.label ??
            (line.showText
              ? resolution.formatAs(
                  line.value,
                  line.format ??
                    (line.axis === 'x'
                      ? x.format
                      : yFormatOf(context, line.axis ?? 'y'))
                )
              : undefined);
          return {
            axis: line.axis ?? 'y',
            value: line.value,
            ...(text === undefined ? {} : { label: text }),
            color: line.color
              ? resolveColor(line.color, resolution.scheme)
              : resolution.chrome.text,
            ...(line.fill ? { fill: line.fill } : {}),
            ...(line.icon ? { icon: line.icon } : {}),
            strokeWidth: line.strokeWidth ?? 1,
            strokeDash: line.strokeDash ?? 'solid',
            textPosition: line.textPosition ?? 'auto',
          };
        })
      : []
  );
};

const yAxisOf = (
  context: XyContext,
  id: YAxisId,
  referenceLines: readonly SceneReferenceLine[]
): SceneAxis | undefined => {
  const { node, horizontal, yEntries } = context;
  const onAxis = yEntries.filter((entry) => entry.axis === id);
  // Reference lines keep their axis even when no series is on it.
  if (onAxis.length === 0 && !referenceLines.some((line) => line.axis === id)) {
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
    format: yFormatOf(context, id),
    domain:
      domain.kind === 'custom'
        ? { kind: 'custom', min: domain.min, max: domain.max }
        : {
            kind: 'data',
            includeZero:
              scale !== 'log' &&
              (percentageAxis(yEntries, id) ||
                (domain.kind === 'full' &&
                  onAxis.some(
                    ({ layer }) => layer.mark === 'bar' || layer.mark === 'area'
                  ))),
            rounding: config?.rounding ?? true,
          },
    ...(config?.title === undefined ? {} : { title: config.title }),
    showTicks: config?.ticks ?? true,
    showGrid: config?.grid ?? true,
    labelRotation: LABEL_ROTATION[config?.labelOrientation ?? 'horizontal'],
  };
};

const xAxisOf = (
  { node, resolution, horizontal, x }: XyContext,
  series: readonly XySeries[],
  numericXs: readonly number[]
): SceneAxis => {
  const xConfig = node.axes?.x;
  // Bars fill buckets where the engine draws them in histogram mode: stacked, or the only bar series.
  const bars = series.filter(({ mark }) => mark === 'bar');
  const twoRows =
    x.scale === 'time' &&
    !horizontal &&
    rastersFit(
      numericXs,
      x.interval,
      xConfig?.domain,
      bars.some(({ stack }) => stack !== undefined || bars.length <= 1)
    );
  return {
    id: 'x',
    position: horizontal ? 'left' : 'bottom',
    scale: x.scale,
    format: x.format,
    ...(x.scale === 'time'
      ? {
          timeZone:
            x.format.kind === 'date'
              ? (x.format.timeZone ?? resolution.timeZone)
              : resolution.timeZone,
        }
      : {}),
    ...(x.scale === 'ordinal'
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
    ...(x.interval === undefined ? {} : { interval: x.interval }),
    ...(xConfig?.title === undefined ? {} : { title: xConfig.title }),
    showTicks: xConfig?.ticks ?? true,
    showGrid: xConfig?.grid ?? true,
    // Lens's two-row time axis takes no `labelsOrientation`.
    labelRotation: twoRows
      ? 0
      : LABEL_ROTATION[xConfig?.labelOrientation ?? 'horizontal'],
    ...(twoRows ? { twoRows: true as const } : {}),
  };
};

/** Each layer's visible annotations; empty for a layer of another kind. */
const annotationsOf = ({
  node,
  resolution,
  x,
}: XyContext): SceneAnnotation[][] =>
  node.layers.map((layer) =>
    layer.kind === 'annotations'
      ? layer.events.flatMap((event): SceneAnnotation[] => {
          if (event.hidden) {
            return [];
          }
          const color = event.color
            ? resolveColor(event.color, resolution.scheme)
            : resolution.chrome.textSubdued;
          const when = (value: number) =>
            resolution.formatAs(
              value,
              x.scale === 'ordinal' ? DEFAULT_FORMATS.date : x.format
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

/** The sentence a summary reads: the y columns, by the x and split columns, and the range of visible values. */
const summarize = (
  { resolution, x, yEntries, hidden }: XyContext,
  resolved: readonly ResolvedSeries[]
): string => {
  const allYs = resolved.flatMap(({ draft: { yColumn, axis }, series }) =>
    hidden.has(series.key)
      ? []
      : series.source.rows.flatMap((row) => {
          const value = toNumber(resolution.cell(yColumn, row));
          return value === undefined
            ? []
            : [{ value, column: yColumn, axis, row }];
        })
  );
  // The summary names a y entry with a visible series, or with none at all.
  const shown = yEntries.filter(({ layerIndex, yIndex }) => {
    const own = resolved.filter(
      ({ draft }) => draft.layerIndex === layerIndex && draft.yIndex === yIndex
    );
    return own.length === 0 || own.some(({ draft }) => !hidden.has(draft.key));
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
  const dimensions = [...(x.column ? [x.column.label] : []), ...splitLabels];
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
  return `${yLabels.join(' and ')}${
    dimensions.length ? ` by ${dimensions.join(' and ')}` : ''
  }${range}.`;
};

/** The Scene of an `xyChart` node. */
export const resolveXy = (
  node: XyChartNode,
  options: ResolveChartOptions
): XyScene => {
  const context = xyContext(node, options);
  const { resolution, interactions } = context;
  const drafts = draftSeries(context);
  const { categories, order, numericXs } = resolveCategories(context, drafts);
  const isPartial = partialBucketOf(context, numericXs);
  const resolved: ResolvedSeries[] = drafts.map((draft, index) => {
    const color = colorOf(context, draft, index);
    const description = draft.split
      ? describe([[draft.split.label, draft.split.text]])
      : draft.label;
    const marks = marksOf(context, draft, order, isPartial);
    return {
      draft,
      description,
      series: toSeries(context, draft, color, description, marks),
    };
  });
  const series = resolved.map(({ series }) => series);

  const referenceLinesByLayer = referenceLinesOf(context);
  const referenceLines = referenceLinesByLayer.flat();
  const xAxis = xAxisOf(context, series, numericXs);
  const legendItems = resolved.map((entry) => toLegendItem(context, entry));
  const annotationsByLayer = annotationsOf(context);
  const sentence = summarize(context, resolved);

  const empty = series.some(({ marks }) => marks.some(({ y }) => y !== null))
    ? undefined
    : { reason: 'noResults' as const, text: NO_RESULTS };

  const y = yAxisOf(context, 'y', referenceLines);
  const y2 = yAxisOf(context, 'y2', referenceLines);
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

  const legendConfig = node.legend;
  const visibility = legendConfig?.visibility ?? 'auto';
  return {
    kind: 'xy',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    orientation: node.orientation ?? 'vertical',
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
    ...(empty ? { empty } : {}),
  };
};
