/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A heatmap node as Lens's heat map draws it (`expression_heatmap`:
// `HeatmapComponent`, `computeColorRanges` and `computeXScale`), with every
// position's order and label, every band's bounds, color and label, and every
// cell's color decided here, so an engine only lays the grid out.

import { coordinateOf } from '../coordinates';
import type { ColorBand } from '../schema/colors';
import type { HeatmapNode } from '../schema/heatmap';

import {
  createResolution,
  describe,
  type Resolution,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { HEATMAP_PALETTE, resolveColor, TRANSPARENT } from './theme';
import type {
  HeatmapAxis,
  HeatmapBand,
  HeatmapCategory,
  HeatmapCell,
  HeatmapScene,
  SceneColor,
  SceneSelection,
} from './types';

/** Lens's text for a heat map with nothing to draw. */
const NO_RESULTS = 'No results found';

const ROTATION = { horizontal: 0, angled: -45, vertical: -90 } as const;

/** Lens's default bands: its palette in equal steps of the value range, the last open above. */
const DEFAULT_BANDS: readonly ColorBand[] = HEATMAP_PALETTE.map(
  (color, index, all) => ({
    from: (100 * index) / all.length,
    ...(index < all.length - 1 ? { to: (100 * (index + 1)) / all.length } : {}),
    color: { light: color, dark: color },
  })
);

/** The least double above `value`, so a band's inclusive top is an exclusive `end`. */
export const nextUp = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (value === 0) {
    return Number.MIN_VALUE;
  }
  const bits = new BigInt64Array(new Float64Array([value]).buffer);
  bits[0] = bits[0]! + (value > 0 ? 1n : -1n);
  return new Float64Array(bits.buffer)[0]!;
};

interface Position {
  readonly identity: string;
  readonly cell: unknown;
  readonly label: string;
  readonly first: number;
  readonly instant?: number;
}

/** Each distinct cell of `column` in the `drawn` rows, in the order rows first show it; -1 for a row not drawn. */
const positionsOf = (
  resolution: Resolution,
  column: string | undefined,
  drawn: readonly boolean[]
): { positions: Position[]; byRow: number[] } => {
  const positions: Position[] = [];
  const index = new Map<string, number>();
  const byRow = resolution.data.rows.map((_, row) => {
    if (!drawn[row]) {
      return -1;
    }
    const identity = column ? resolution.identity(column, row) : '';
    let at = index.get(identity);
    if (at === undefined) {
      at = positions.length;
      index.set(identity, at);
      const cell = column ? resolution.cell(column, row) : null;
      const instant =
        column && resolution.column(column).type === 'date'
          ? coordinateOf(cell, 'temporal')
          : undefined;
      positions.push({
        identity,
        cell,
        label: column ? resolution.text(column, row) : '',
        first: row,
        ...(instant === undefined ? {} : { instant }),
      });
    }
    return at;
  });
  return { positions, byRow };
};

/** Positions in axis order: by `sort` if stated, numbers by value and anything else by label. */
const ordered = (
  positions: readonly Position[],
  sort: 'asc' | 'desc' | undefined,
  locale: string,
  time: boolean
): Position[] => {
  if (time) {
    return [...positions].sort((a, b) => a.instant! - b.instant!);
  }
  if (sort === undefined) {
    return [...positions];
  }
  const sign = sort === 'asc' ? 1 : -1;
  return [...positions].sort((a, b) => {
    const byValue =
      typeof a.cell === 'number' && typeof b.cell === 'number'
        ? a.cell - b.cell
        : a.label.localeCompare(b.label, locale);
    return sign * byValue || a.first - b.first;
  });
};

const OFFSET = /^GMT(?:([+-])(\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?$/;
const offsetFormats = new Map<string, Intl.DateTimeFormat>();

/** `zone`'s offset from UTC at `instant`, in milliseconds. */
const offsetAt = (instant: number, zone: string): number => {
  let format = offsetFormats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    });
    offsetFormats.set(zone, format);
  }
  const name = format
    .formatToParts(instant)
    .find(({ type }) => type === 'timeZoneName')?.value;
  const [, sign, hours = '0', minutes = '0', seconds = '0'] =
    OFFSET.exec(name ?? '') ?? [];
  const size =
    (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
  return sign === '-' ? -size : size;
};

/**
 * The first of `zones` whose round times every instant falls on, `interval`
 * apart: where a date histogram in that zone starts its buckets, and where
 * Elastic Charts lays a time grid out in it (`esFixedIntervalSnap`). A cell
 * off that grid has no column, so with no zone that fits there is no time axis.
 */
const gridZone = (
  instants: readonly number[],
  interval: number,
  ...zones: string[]
): string | undefined =>
  [...new Set([...zones, 'UTC'])].find((zone) => {
    try {
      return instants.every(
        (instant) =>
          (((instant + offsetAt(instant, zone)) % interval) + interval) %
            interval ===
          0
      );
    } catch {
      return false;
    }
  });

/** The Scene of a `heatmap` node. */
export const resolveHeatmap = (
  node: HeatmapNode,
  options: ResolveChartOptions
): HeatmapScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme, locale } = resolution;
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('cell');
  const xColumn = node.x.column;
  const yColumn = node.y?.column;
  const valueColumn = node.value.column;
  const valueLabel = resolution.column(valueColumn).label;

  // Elastic Charts' heat map draws no row whose x or y cell is missing
  // (`getHeatmapTableSelector`), so Lens shows neither the row nor its position.
  const present = (column: string | undefined, row: number) => {
    if (column === undefined) {
      return true;
    }
    const cell = resolution.cell(column, row);
    return cell !== null && cell !== undefined;
  };
  const drawn = data.rows.map(
    (_, row) => present(xColumn, row) && present(yColumn, row)
  );
  const x = positionsOf(resolution, xColumn, drawn);
  const y = positionsOf(resolution, yColumn, drawn);
  const isDate = resolution.column(xColumn).type === 'date';
  const xFormat = resolution.format(xColumn);
  const instants = [
    ...new Set(
      x.positions.flatMap(({ instant }) =>
        instant === undefined ? [] : [instant]
      )
    ),
  ].sort((a, b) => a - b);
  // A time axis needs every position to be an instant, and a bucket width:
  // stated, else the smallest spacing between instants, as Lens infers it.
  const smallest = instants
    .slice(1)
    .reduce<number | undefined>(
      (least, instant, index) =>
        Math.min(least ?? Infinity, instant - instants[index]!),
      undefined
    );
  const interval = node.x.interval ?? smallest;
  const timeZone =
    isDate && interval !== undefined
      ? gridZone(
          instants,
          interval,
          (xFormat.kind === 'date' ? xFormat.timeZone : undefined) ??
            resolution.timeZone,
          resolution.timeZone
        )
      : undefined;
  const time =
    timeZone !== undefined &&
    x.positions.every(({ instant }) => instant !== undefined);
  const xOrder = ordered(x.positions, node.x.sort, locale, time);
  const yOrder = ordered(y.positions, node.y?.sort, locale, false);
  const xRank = new Map(xOrder.map((position, rank) => [position, rank]));
  const yRank = new Map(yOrder.map((position, rank) => [position, rank]));

  const category = (position: Position, keyed: boolean): HeatmapCategory => ({
    x:
      keyed && position.instant !== undefined
        ? position.instant
        : position.identity,
    label: position.label,
  });
  const axisConfig = node.axes;
  const xDomain = axisConfig?.x?.domain;
  const xAxis: HeatmapAxis = {
    column: xColumn,
    label: resolution.column(xColumn).label,
    ...(axisConfig?.x?.title === undefined
      ? {}
      : { title: axisConfig.x.title }),
    scale: time ? 'time' : 'ordinal',
    format: xFormat,
    ...(time && timeZone !== undefined && interval !== undefined
      ? {
          timeZone,
          interval,
          ...(xDomain?.kind === 'custom'
            ? { domain: { min: xDomain.min, max: xDomain.max } }
            : {}),
        }
      : {}),
    showLabels: axisConfig?.x?.labels ?? true,
    labelRotation: ROTATION[axisConfig?.x?.labelOrientation ?? 'horizontal'],
    categories: xOrder.map((position) => category(position, time)),
  };
  const yAxis: HeatmapAxis = {
    ...(yColumn === undefined ? {} : { column: yColumn }),
    label: yColumn === undefined ? '' : resolution.column(yColumn).label,
    ...(axisConfig?.y?.title === undefined
      ? {}
      : { title: axisConfig.y.title }),
    scale: 'ordinal',
    format:
      yColumn === undefined ? { kind: 'text' } : resolution.format(yColumn),
    showLabels: yColumn !== undefined && (axisConfig?.y?.labels ?? true),
    labelRotation: 0,
    categories: yOrder.map((position) => category(position, false)),
  };

  // Cells: one per x and y pair, from the first row with a value. Rows that
  // share the pair (date-times for one instant) belong to it. Bands span every
  // row's value, drawn or not, as Lens's `findMinMaxByColumnId` reads the table.
  const values = data.rows.map((_, row) =>
    toNumber(resolution.cell(valueColumn, row))
  );
  const finite = values.filter((value): value is number => value !== undefined);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;

  const percentage =
    node.bandsRange === 'percentage' || !node.colors?.bands?.length;
  const absolute = (bound: number | undefined) =>
    bound === undefined || !percentage
      ? bound
      : min + ((max - min) * bound) / 100;
  const stated = node.colors?.bands?.length ? node.colors.bands : DEFAULT_BANDS;
  const format = (value: number) => resolution.valueText(valueColumn, value);
  const bands: HeatmapBand[] = stated.flatMap(
    ({ from, to, color }, index): HeatmapBand[] => {
      const last = index === stated.length - 1;
      const start = absolute(from);
      const top = absolute(to);
      const end = top === undefined ? undefined : last ? nextUp(top) : top;
      if (start !== undefined && end !== undefined && !(start < end)) {
        return [];
      }
      const label =
        start === undefined && top === undefined
          ? valueLabel
          : start === undefined
            ? `< ${format(top!)}`
            : top === undefined
              ? `≥ ${format(start)}`
              : `${format(start)} - ${format(top)}`;
      return [
        {
          ...(start === undefined ? {} : { start }),
          ...(end === undefined ? {} : { end }),
          color: resolveColor(color, scheme),
          label,
        },
      ];
    }
  );
  const colorOf = (value: number): SceneColor =>
    bands.find(
      ({ start, end }) =>
        (start === undefined || start <= value) &&
        (end === undefined || value < end)
    )?.color ?? TRANSPARENT;

  const pairs = new Map<string, number[]>();
  data.rows.forEach((_, row) => {
    if (!drawn[row]) {
      return;
    }
    const key = `${x.byRow[row]}:${y.byRow[row]}`;
    const rows = pairs.get(key) ?? [];
    rows.push(row);
    pairs.set(key, rows);
  });
  const describeCell = (row: number, valueText: string) =>
    describe([
      [xAxis.label, x.positions[x.byRow[row]!]!.label],
      ...(yColumn === undefined
        ? []
        : [[yAxis.label, y.positions[y.byRow[row]!]!.label] as const]),
      [valueLabel, valueText],
    ]);
  const cells: HeatmapCell[] = [];
  for (const rows of pairs.values()) {
    const row = rows.find((one) => values[one] !== undefined);
    if (row === undefined) {
      continue;
    }
    const value = values[row]!;
    const valueText = resolution.text(valueColumn, row);
    const color = colorOf(value);
    const columns = [xColumn, ...(yColumn === undefined ? [] : [yColumn])];
    const description = describeCell(row, valueText);
    const selection: SceneSelection | undefined = selectable
      ? {
          target: 'cell',
          rows: [...rows],
          columns,
          values: Object.fromEntries(
            columns.map((column) => [column, resolution.cell(column, row)])
          ),
          description,
        }
      : undefined;
    cells.push({
      x: xRank.get(x.positions[x.byRow[row]!]!)!,
      y: yRank.get(y.positions[y.byRow[row]!]!)!,
      value,
      valueText,
      color,
      source: { rows: [...rows], columns: [...columns, valueColumn] },
      tooltip: {
        entries: [
          { label: xAxis.label, value: x.positions[x.byRow[row]!]!.label },
          ...(yColumn === undefined
            ? []
            : [
                {
                  label: yAxis.label,
                  value: y.positions[y.byRow[row]!]!.label,
                },
              ]),
          { label: valueLabel, value: valueText, color },
        ],
      },
      description,
      ...(selection ? { selection } : {}),
    });
  }

  const empty =
    cells.length === 0
      ? { reason: 'noResults' as const, text: NO_RESULTS }
      : undefined;
  const lowest = cells.reduce<HeatmapCell | undefined>(
    (least, cell) => (least && least.value <= cell.value ? least : cell),
    undefined
  );
  const highest = cells.reduce<HeatmapCell | undefined>(
    (most, cell) => (most && most.value >= cell.value ? most : cell),
    undefined
  );
  const by = [
    xAxis.label,
    ...(yColumn === undefined ? [] : [yAxis.label]),
  ].join(' and ');
  const sentence = empty
    ? `${valueLabel} by ${by} has no data.`
    : `${valueLabel} by ${by}, from ${lowest!.valueText} to ${highest!.valueText}.`;
  const legend = node.legend;

  return {
    kind: 'heatmap',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    x: xAxis,
    y: yAxis,
    valueLabel,
    cells,
    bands,
    cellLabels: node.cellLabels ?? false,
    gridLines: {
      width: node.gridLines?.width ?? 1,
      color: node.gridLines?.color
        ? resolveColor(node.gridLines.color, scheme)
        : chrome.gridLine,
    },
    legend: {
      visible: !empty && (legend?.visibility ?? 'visible') === 'visible',
      position: legend?.position ?? 'right',
      maxLines: legend?.maxLines ?? 1,
      size: legend?.size ?? 'auto',
    },
    ...(empty ? { empty } : {}),
  };
};
