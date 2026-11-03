/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Reproduces what Lens's `metricVis` draws (`expression_metric`'s
// `metric_vis.tsx` and `secondary_metric_info.ts`) from the expression its
// metric `toExpression` builds.

import {
  formatValue,
  MAX_PALETTE_BANDS,
  type MetricNode,
  type MetricTile,
  VALUE_PALETTES,
  type ValueFormat,
  type ValuePalette,
} from '@elastic/isomer-primitives-charts/model';

import type { JsonValue } from '../../json';
import { own } from '../../own';
import type { LensDiagnostic, LensTable } from '../../schema';
import { collapseRows } from '../collapse';
import { toValueFormat } from '../format';
import {
  type Bounds,
  colorForValue,
  customPalette,
  extent,
  namedPalette,
  namedPaletteBands,
  paletteBounds,
} from '../palette';
import { type BoundColumn, cell, column } from '../table';

import type { MetricState } from './state';

type Row = readonly JsonValue[];
type Tone = 'danger' | 'default' | 'success' | 'primary' | 'warning';
type Secondary = NonNullable<MetricTile['secondary']>;

const VIS = ['savedObject', 'attributes', 'state', 'visualization'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const STATIC_SECONDARY_COLOR = '#E4E8F1';

/** `getMappedSecondaryTrendPalettes`: down, flat, up. */
const TREND_PALETTES: Record<string, readonly [Tone, Tone, Tone]> = {
  compare_to: ['danger', 'default', 'success'],
  complementary: ['primary', 'default', 'warning'],
  temperature: ['primary', 'default', 'danger'],
};

export interface MetricBindContext {
  state: MetricState;
  tables: readonly LensTable[];
  filterAction?: string | undefined;
}

export type MetricBound =
  | { ok: true; node: MetricNode }
  | {
      ok: false;
      status: 'invalid' | 'unsupported';
      diagnostics: LensDiagnostic[];
    };

class Problems {
  invalid: LensDiagnostic[] = [];
  unsupported: LensDiagnostic[] = [];
  add(
    status: 'invalid' | 'unsupported',
    code: string,
    message: string,
    path: readonly (string | number)[] = VIS
  ) {
    this[status].push({ code: `lens.metric.${code}`, message, path });
  }
}

/** Kibana's `alwaysShowSign`: a `+` unless the value rounds to zero. */
const signedReading = (delta: number, format: ValueFormat | undefined) => {
  const shown = formatValue(delta, format);
  return delta > 0 && shown !== formatValue(0, format) ? `+${shown}` : shown;
};

/** A cell as Kibana's field formats convert it to text, missing labels included. */
const formatCell = (
  value: JsonValue | undefined,
  format: ValueFormat | undefined
) =>
  value === null || value === undefined
    ? '(null)'
    : value === ''
      ? '(blank)'
      : typeof value === 'number'
        ? formatValue(value, format)
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

const columnFormat = (
  bound: BoundColumn | undefined,
  problems: Problems
): ValueFormat | undefined => {
  if (!bound) {
    return undefined;
  }
  const mapped = toValueFormat(bound.lens.params);
  if (!mapped.ok) {
    problems.add(
      'unsupported',
      'unsupported-format',
      mapped.outOfRange
        ? `The "${mapped.id}" format of column "${bound.lens.columnId}" has parameters out of range.`
        : `The "${mapped.id}" format of column "${bound.lens.columnId}" is not supported yet.`
    );
    return undefined;
  }
  // `lens_format_column` formats number columns only.
  return bound.numeric ? mapped.format : undefined;
};

const isDate = ({ lens, type }: BoundColumn) =>
  lens.meta?.type === 'date' || type === 'date' || type === 'date_nanos';

const toEpoch = (value: JsonValue | undefined): number | undefined => {
  const epoch =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Date.parse(value)
        : NaN;
  return Number.isInteger(epoch) ? epoch : undefined;
};

const trendKey = (value: JsonValue | undefined) =>
  JSON.stringify(value ?? null);

const bindTrends = (
  { state, tables }: MetricBindContext,
  problems: Problems
): Map<string, { x: number; y: number | null }[]> | undefined => {
  const {
    trendlineLayerId,
    trendlineTimeAccessor,
    trendlineMetricAccessor,
    trendlineBreakdownByAccessor,
    collapseFn,
  } = state;
  if (!trendlineLayerId || !trendlineTimeAccessor || !trendlineMetricAccessor) {
    return undefined;
  }
  const table = tables.find(({ layerId }) => layerId === trendlineLayerId);
  if (!table) {
    problems.add(
      'invalid',
      'missing-table',
      `No response table for trend layer "${trendlineLayerId}".`
    );
    return undefined;
  }
  const time = column(table, trendlineTimeAccessor);
  const metric = column(table, trendlineMetricAccessor);
  if (!time || !metric) {
    problems.add(
      'invalid',
      'missing-column',
      `The trend layer "${trendlineLayerId}" lacks its time or metric column.`
    );
    return undefined;
  }
  const breakdown = collapseFn
    ? undefined
    : column(table, trendlineBreakdownByAccessor);
  if (!collapseFn && trendlineBreakdownByAccessor && !breakdown) {
    problems.add(
      'invalid',
      'missing-column',
      `The trend layer "${trendlineLayerId}" has no breakdown column "${trendlineBreakdownByAccessor}".`
    );
    return undefined;
  }
  const rows = collapseFn
    ? collapseRows(
        table.rows,
        [time.index],
        [{ index: metric.index, fn: collapseFn }]
      )
    : table.rows;
  const series = new Map<string, { x: number; y: number | null }[]>();
  rows.forEach((row, index) => {
    const x = toEpoch(cell(row, time));
    if (x === undefined) {
      problems.add(
        'invalid',
        'invalid-trend-time',
        'A trend row has no valid timestamp.',
        ['tables', trendlineLayerId, 'rows', index]
      );
      return;
    }
    const y = cell(row, metric);
    const key = breakdown ? trendKey(cell(row, breakdown)) : 'default';
    const points = series.get(key) ?? [];
    points.push({ x, y: typeof y === 'number' ? y : null });
    series.set(key, points);
  });
  for (const [key, points] of series) {
    points.sort((a, b) => a.x - b.x);
    if (points.some((point, i) => i > 0 && point.x === points[i - 1]!.x)) {
      problems.add(
        'invalid',
        'duplicate-trend-time',
        `The trend for ${key} has two points at one instant.`
      );
    }
  }
  return series;
};

const bindSecondary = (
  { state }: MetricBindContext,
  row: Row,
  bound: BoundColumn,
  primary: number | string | null,
  primaryNumeric: boolean,
  problems: Problems
): Secondary => {
  const format = columnFormat(bound, problems);
  const visibility = state.secondaryNameVisibility ?? 'hidden';
  const label =
    visibility === 'hidden' ? undefined : (state.secondaryLabel ?? bound.label);
  const labels = {
    ...(label?.trim() ? { label } : {}),
    ...(visibility === 'after' || visibility === 'tooltip'
      ? { labelPosition: visibility }
      : {}),
  };
  const raw = cell(row, bound);
  const formatted = formatCell(raw, format);
  const mode =
    !state.secondaryTrend || state.secondaryTrend.type === 'none'
      ? 'none'
      : !bound.numeric || state.secondaryTrend.type === 'static'
        ? 'static'
        : 'dynamic';
  if (mode === 'static') {
    const color =
      state.secondaryTrend?.type === 'static'
        ? state.secondaryTrend.color
        : STATIC_SECONDARY_COLOR;
    if (!HEX.test(color)) {
      problems.add(
        'unsupported',
        'unsupported-color',
        `The secondary color "${color}" is not a #rrggbb color.`
      );
    }
    return {
      kind: 'value',
      ...labels,
      value: formatted,
      badge: { color: color },
    };
  }
  if (mode === 'none' || !(typeof raw === 'number' || raw == null)) {
    return { kind: 'value', ...labels, value: formatted };
  }
  const trend =
    state.secondaryTrend?.type === 'dynamic'
      ? state.secondaryTrend
      : {
          visuals: 'both' as const,
          paletteId: 'compare_to',
          reversed: false,
          baselineValue: 0,
        };
  const saved =
    trend.baselineValue === 'primary' && !primaryNumeric
      ? 0
      : trend.baselineValue;
  // A missing primary is `NaN` in `metricVis`, still a number.
  const primaryValue =
    typeof primary === 'number' ? primary : primary === null ? NaN : undefined;
  const compareToPrimary = saved === 'primary' && primaryValue !== undefined;
  const baseline = typeof saved === 'number' ? saved : (primaryValue ?? 0);
  const delta =
    raw == null || !Number.isFinite(baseline)
      ? NaN
      : (compareToPrimary ? -1 : 1) * (raw - baseline);
  const palette =
    own(TREND_PALETTES, trend.paletteId) ?? TREND_PALETTES.compare_to!;
  const [down, flat, up] = trend.reversed ? [...palette].reverse() : palette;
  const showIcon = trend.visuals !== 'value';
  const showValue = trend.visuals !== 'icon';
  const direction = Number.isNaN(delta)
    ? undefined
    : delta < 0
      ? ('down' as const)
      : delta > 0
        ? ('up' as const)
        : ('flat' as const);
  const color = direction === 'down' ? down : direction === 'up' ? up : flat;
  const shown = !compareToPrimary
    ? formatted
    : Number.isNaN(delta)
      ? 'N/A'
      : signedReading(delta, format);
  if (showIcon && !showValue && !direction) {
    return { kind: 'value', ...labels };
  }
  return {
    kind: 'value',
    ...labels,
    ...(showValue ? { value: shown } : {}),
    badge: { color, ...(showIcon && direction ? { direction } : {}) },
  };
};

type TileColor = NonNullable<MetricTile['color']>;

const isValuePalette = (name: string): name is ValuePalette =>
  (VALUE_PALETTES as readonly string[]).includes(name);

/** The saved color, or the band color by value picks; `undefined` paints nothing. */
const tileColor = (
  state: MetricState,
  value: number | string | null,
  bounds: () => Bounds,
  problems: Problems
): TileColor | undefined => {
  const { palette, color } = state;
  if (palette?.params && typeof value === 'number' && Number.isFinite(value)) {
    // `getOverridePaletteColors` reads the palette's name for its colors;
    // `computePaletteParams` reads `params.name` for its stop positions.
    const positioned = palette.params.name === 'custom';
    if (palette.name === 'custom') {
      const picked = colorForValue(
        value,
        customPalette(palette.params, positioned),
        bounds()
      );
      return picked === undefined
        ? undefined
        : hexColor(picked, problems, [...VIS, 'palette']);
    }
    const bands = namedPaletteBands(palette.params);
    if (!isValuePalette(palette.name) || bands > MAX_PALETTE_BANDS) {
      problems.add(
        'unsupported',
        'unsupported-palette',
        `The "${palette.name}" palette with ${bands} bands is not a value palette.`,
        [...VIS, 'palette']
      );
      return undefined;
    }
    const named = namedPalette(palette.params, positioned);
    const step = colorForValue(value, named, bounds());
    return step === undefined
      ? undefined
      : { palette: palette.name, step, of: named.colors.length };
  }
  return color === undefined
    ? undefined
    : hexColor(color, problems, [...VIS, 'color']);
};

const hexColor = (
  color: string,
  problems: Problems,
  path: readonly (string | number)[]
): `#${string}` | undefined => {
  if (HEX.test(color)) {
    return color as `#${string}`;
  }
  problems.add(
    'unsupported',
    'unsupported-color',
    `The color "${color}" is not a #rrggbb color.`,
    path
  );
  return undefined;
};

export const bindMetric = (context: MetricBindContext): MetricBound => {
  const { state, tables, filterAction } = context;
  const problems = new Problems();
  if (!state.metricAccessor) {
    problems.add(
      'invalid',
      'missing-accessor',
      'The metric has no primary accessor.',
      [...VIS, 'metricAccessor']
    );
    return { ok: false, status: 'invalid', diagnostics: problems.invalid };
  }
  if (state.icon && state.icon !== 'empty') {
    problems.add(
      'unsupported',
      'unsupported-icon',
      `Tile icons ("${state.icon}") are not supported yet.`,
      [...VIS, 'icon']
    );
  }
  const table = tables.find(({ layerId }) => layerId === state.layerId);
  if (!table) {
    problems.add(
      'invalid',
      'missing-table',
      `No response table for layer "${state.layerId}".`,
      ['tables']
    );
    return { ok: false, status: 'invalid', diagnostics: problems.invalid };
  }
  const metric = column(table, state.metricAccessor);
  const secondary = column(table, state.secondaryMetricAccessor);
  const max = column(table, state.maxAccessor);
  const breakdownColumn = column(table, state.breakdownByAccessor);
  for (const [accessor, bound] of [
    [state.metricAccessor, metric],
    [state.secondaryMetricAccessor, secondary],
    [state.maxAccessor, max],
    [state.breakdownByAccessor, breakdownColumn],
  ] as const) {
    if (accessor && !bound) {
      problems.add(
        'invalid',
        'missing-column',
        `Layer "${state.layerId}" has no column "${accessor}".`
      );
    }
  }
  if (!metric || problems.invalid.length) {
    return { ok: false, status: 'invalid', diagnostics: problems.invalid };
  }

  const canCollapse = Boolean(state.collapseFn) && metric.numeric;
  const rows: readonly Row[] = canCollapse
    ? collapseRows(
        table.rows,
        [],
        [metric, secondary, max]
          .filter((bound): bound is BoundColumn => bound !== undefined)
          .map(({ index }) => ({ index, fn: state.collapseFn! }))
      )
    : table.rows;
  const breakdown = canCollapse ? undefined : breakdownColumn;
  const tileRows: readonly Row[] = breakdown
    ? rows
    : rows.length
      ? rows.slice(0, 1)
      : [table.columns.map(() => null)];

  for (const bound of [metric, secondary, breakdown]) {
    if (bound && isDate(bound)) {
      problems.add(
        'unsupported',
        'unsupported-date',
        `Date column "${bound.lens.columnId}" needs the host's date format and time zone, which are not supported yet.`
      );
    }
  }
  const format = columnFormat(metric, problems);
  const breakdownFormat = columnFormat(breakdown, problems);
  const trends = bindTrends(context, problems);
  const showingBar = Boolean(state.showBar && state.maxAccessor);
  const keys = new Map<string, number>();
  const metricExtent = extent(rows.map((r) => cell(r, metric)));

  const tiles = tileRows.map((row, rowIndex): MetricTile => {
    const raw = cell(row, metric);
    if (typeof raw === 'object' && raw !== null) {
      problems.add(
        'unsupported',
        'unsupported-multivalue',
        'Multivalue and object metric readings are not supported yet.',
        ['tables', state.layerId, 'rows', rowIndex]
      );
    }
    const value =
      typeof raw === 'number' || typeof raw === 'string'
        ? raw
        : typeof raw === 'boolean'
          ? String(raw)
          : null;
    const breakdownValue = cell(row, breakdown);
    const title = breakdown
      ? formatCell(breakdownValue ?? null, breakdownFormat)
      : metric.label;
    const subtitle = breakdown ? metric.label : state.subtitle;
    const base = breakdown ? JSON.stringify(breakdownValue ?? null) : 'metric';
    const seen = (keys.get(base) ?? 0) + 1;
    keys.set(base, seen);
    const key = seen === 1 ? base : `${base}#${seen}`;

    const color = tileColor(
      state,
      value,
      () =>
        paletteBounds(metricExtent, {
          max: max ? cell(rows[rowIndex]!, max) : undefined,
          hasMax: Boolean(max),
          breakdown: Boolean(breakdown),
        }),
      problems
    );
    const tile: MetricTile = {
      key,
      ...(title?.trim() ? { title } : {}),
      ...(subtitle?.trim() ? { subtitle } : {}),
      value,
      ...(format && typeof value === 'number' ? { format } : {}),
      ...(color ? { color } : {}),
    };
    if (secondary) {
      tile.secondary = bindSecondary(
        context,
        row,
        secondary,
        value,
        metric.numeric,
        problems
      );
    }
    // `getDefaultColor`: Lens paints these when no color or palette applies.
    const paletteApplies =
      Boolean(state.palette?.params) &&
      typeof value === 'number' &&
      Number.isFinite(value);
    const defaultFill =
      color !== undefined || paletteApplies
        ? undefined
        : showingBar && metric.numeric
          ? ({ token: 'progress' } as const)
          : state.applyColorTo === 'value'
            ? ({ token: 'valueText' } as const)
            : undefined;
    const points =
      typeof value === 'number'
        ? trends?.get(breakdown ? trendKey(breakdownValue) : 'default')
        : undefined;
    // A progress bar's own default is the resolver's.
    const paintsDefault =
      typeof value !== 'number'
        ? Boolean(state.applyColorTo)
        : points !== undefined || !(showingBar && max);
    if (defaultFill && paintsDefault) {
      tile.color = defaultFill;
    }
    if (typeof value === 'number') {
      if (points) {
        tile.visual = { kind: 'trend', points };
      } else if (showingBar && max) {
        const domainMax = cell(row, max);
        if (typeof domainMax === 'number' || domainMax === null) {
          tile.visual = {
            kind: 'progress',
            // d3 reads a null domain bound as 0.
            max: domainMax ?? 0,
            ...(state.progressDirection === 'horizontal'
              ? { direction: 'horizontal' }
              : {}),
          };
        } else {
          problems.add(
            'unsupported',
            'unsupported-progress-domain',
            'A progress max that is not a number is not supported.'
          );
        }
      } else if (state.applyColorTo === 'value' && tile.color) {
        tile.colorTarget = 'value';
      }
    }
    if (filterAction && breakdown) {
      const filterValue = breakdownValue ?? null;
      if (filterValue === null || typeof filterValue !== 'object') {
        tile.action = {
          name: filterAction,
          filters: [{ field: breakdown.lens.fieldName, value: filterValue }],
        };
      } else {
        problems.add(
          'unsupported',
          'unsupported-filter-value',
          'A multivalue breakdown cannot be a filter yet.'
        );
      }
    }
    return tile;
  });

  if (problems.invalid.length) {
    return { ok: false, status: 'invalid', diagnostics: problems.invalid };
  }
  if (problems.unsupported.length) {
    return {
      ok: false,
      status: 'unsupported',
      diagnostics: problems.unsupported,
    };
  }
  const layout = {
    ...(state.titlesTextAlign ? { titleAlign: state.titlesTextAlign } : {}),
    ...(state.primaryAlign ? { valueAlign: state.primaryAlign } : {}),
    ...(state.secondaryAlign ? { secondaryAlign: state.secondaryAlign } : {}),
    ...(state.primaryPosition ? { valuePosition: state.primaryPosition } : {}),
    ...(state.valueFontMode ? { valueSize: state.valueFontMode } : {}),
    ...(state.density ? { density: state.density } : {}),
  };
  return {
    ok: true,
    node: {
      type: 'metric',
      tiles,
      ...(state.maxCols ? { columns: state.maxCols } : {}),
      ...(Object.keys(layout).length ? { layout } : {}),
    },
  };
};
