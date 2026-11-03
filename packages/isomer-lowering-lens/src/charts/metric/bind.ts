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
  TILE_ICONS,
  type TileIcon,
  VALUE_PALETTES,
  type ValueFormat,
  type ValuePalette,
} from '@elastic/isomer-primitives-charts/model';

import type { JsonValue } from '../../json';
import { own } from '../../own';
import type {
  FormLayerPlan,
  LensDiagnostic,
  LensLayerPlan,
  LensTable,
} from '../../schema';
import { collapseRows } from '../collapse';
import { type DateContext, isKnownTimeZone, readDate } from '../dates';
import { fromFieldFormat, toValueFormat } from '../format';
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
  /** The plan's layers, for the form-based column state a table lacks. */
  layers: readonly (LensLayerPlan | FormLayerPlan)[];
  filterAction?: string | undefined;
  dates?: DateContext | undefined;
}

type DateReader = (value: JsonValue | undefined) => string;

type PlannedColumn = FormLayerPlan['columns'][number];

const isTileIcon = (icon: string): icon is TileIcon =>
  (TILE_ICONS as readonly string[]).includes(icon);

const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A form-based column's saved state, or `undefined` for ES|QL. */
const plannedColumn = (
  { layers }: MetricBindContext,
  layerId: string,
  columnId: string | undefined
): PlannedColumn | undefined => {
  const layer = layers.find((planned) => planned.layerId === layerId);
  return layer?.kind === 'form'
    ? layer.columns.find((column) => column.columnId === columnId)
    : undefined;
};

/** `getMaxPossibleNumValues`: how many tiles a breakdown can have. */
const maxPossibleTiles = (column: PlannedColumn | undefined): number => {
  const params = isRecord(column?.params) ? column.params : {};
  if (column?.operationType === 'terms' && typeof params.size === 'number') {
    return params.size + (params.otherBucket === true ? 1 : 0);
  }
  if (column?.operationType === 'filters' && Array.isArray(params.filters)) {
    return params.filters.length;
  }
  return 0;
};

/** The labels Kibana's terms format gives Lens's `__other__` and `__missing__` buckets. */
const bucketLabels = (
  bound: BoundColumn,
  column: PlannedColumn | undefined
): { other?: string; missing?: string } => {
  const rendered = bound.lens.meta?.params;
  if (
    isRecord(rendered) &&
    rendered.id === 'terms' &&
    isRecord(rendered.params)
  ) {
    const { otherBucketLabel, missingBucketLabel } = rendered.params;
    return {
      ...(typeof otherBucketLabel === 'string' && otherBucketLabel
        ? { other: otherBucketLabel }
        : {}),
      ...(typeof missingBucketLabel === 'string' && missingBucketLabel
        ? { missing: missingBucketLabel }
        : {}),
    };
  }
  // Lens's terms column sets `otherBucketLabel: 'Other'` and no missing label.
  return column?.operationType === 'terms' &&
    isRecord(column.params) &&
    column.params.otherBucket === true
    ? { other: 'Other' }
    : {};
};

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
  return delta > 0 && shown !== formatValue(0, format) && !shown.startsWith('+')
    ? `+${shown}`
    : shown;
};

/** Kibana's `MISSING_TOKEN`, a missing terms bucket. */
const MISSING = '__missing__';

/**
 * A cell as Kibana's field formats convert it to text, missing labels
 * included; a multivalue cell is `formatTextArray`'s JSON of each reading.
 */
const formatCell = (
  value: JsonValue | undefined,
  format: ValueFormat | undefined
): string =>
  value === null || value === undefined || value === MISSING
    ? '(null)'
    : value === ''
      ? '(blank)'
      : typeof value === 'number'
        ? formatValue(value, format)
        : Array.isArray(value)
          ? JSON.stringify(value.map((each) => formatCell(each, format)))
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

/** Text formats that read a cell as it is: Kibana's `string` without a transform, and `boolean`. */
const isPlainTextFormat = (serialized: JsonValue | undefined): boolean => {
  const inner =
    isRecord(serialized) &&
    serialized.id === 'terms' &&
    isRecord(serialized.params)
      ? serialized.params
      : serialized;
  if (inner === undefined || inner === null) {
    return true;
  }
  if (!isRecord(inner)) {
    return false;
  }
  const params = isRecord(inner.params) ? inner.params : {};
  return (
    inner.id === undefined ||
    inner.id === 'boolean' ||
    (inner.id === 'string' &&
      (params.transform === undefined || params.transform === false))
  );
};

const columnFormat = (
  bound: BoundColumn | undefined,
  problems: Problems
): ValueFormat | undefined => {
  if (!bound) {
    return undefined;
  }
  const { columnId, params, meta } = bound.lens;
  // `lens_format_column` formats number columns only; others keep their data view format.
  if (!bound.numeric) {
    if (!isDate(bound) && !isPlainTextFormat(meta?.params)) {
      const id = isRecord(meta?.params) ? meta.params.id : undefined;
      problems.add(
        'unsupported',
        'unsupported-format',
        `The "${typeof id === 'string' ? id : 'unknown'}" format of column "${columnId}" is not supported yet.`
      );
    }
    return undefined;
  }
  const mapped = toValueFormat(params);
  if (mapped.ok && mapped.format) {
    return mapped.format;
  }
  // Without a Lens format, the table's own data view format applies; Kibana
  // wraps a terms column's format in a `terms` format.
  const saved = meta?.params;
  const viewed = fromFieldFormat(
    isRecord(saved) && saved.id === 'terms' && isRecord(saved.params)
      ? saved.params
      : saved
  );
  const failed = !mapped.ok ? mapped : !viewed.ok ? viewed : undefined;
  if (failed) {
    problems.add(
      'unsupported',
      'unsupported-format',
      failed.outOfRange
        ? `The "${failed.id}" format of column "${columnId}" has parameters out of range.`
        : `The "${failed.id}" format of column "${columnId}" is not supported yet.`
    );
    return undefined;
  }
  return viewed.ok ? viewed.format : undefined;
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
  context: MetricBindContext,
  row: Row,
  bound: BoundColumn,
  primary: MetricTile['value'],
  primaryNumeric: boolean,
  problems: Problems
): Secondary => {
  const { state } = context;
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
  const date = dateReader(context, bound, problems);
  const formatted = date ? date(raw) : formatCell(raw, format);
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
  value: MetricTile['value'],
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

type Filter = NonNullable<NonNullable<MetricTile['action']>['filters']>[number];

const isRaw = (value: JsonValue): value is string | number | boolean | null =>
  value === null || typeof value !== 'object';

/**
 * The filter Kibana's `createFilter` builds when a breakdown tile is clicked:
 * a value, the negated shown terms for Other, a negated existence for a
 * missing value, a range bucket's range, or a `filters` bucket's query.
 */
const bucketFilter = (
  breakdown: BoundColumn,
  planned: PlannedColumn | undefined,
  value: JsonValue,
  rows: readonly Row[]
): Filter | undefined => {
  const field = breakdown.lens.fieldName;
  const params = isRecord(planned?.params) ? planned.params : {};
  if (planned === undefined) {
    // ES|QL: `buildRawColumnFilter`.
    if (value === null) {
      return { field, exists: false };
    }
    if (Array.isArray(value)) {
      return value.length > 0 && value.every(isRaw)
        ? { field, values: value }
        : undefined;
    }
    return isRaw(value) ? { field, value } : undefined;
  }
  switch (planned.operationType) {
    case 'terms': {
      if (
        Array.isArray(params.secondaryFields) &&
        params.secondaryFields.length > 0
      ) {
        return undefined;
      }
      if (value === '__other__') {
        const shown = rows
          .map((row) => row[breakdown.index])
          .filter(
            (term): term is string | number | boolean =>
              term !== '__other__' &&
              term !== MISSING &&
              term !== null &&
              isRaw(term!)
          );
        return shown.length > 0
          ? { field, values: [...new Set(shown)], negate: true }
          : undefined;
      }
      if (value === MISSING) {
        return { field, exists: false };
      }
      return isRaw(value) ? { field, value } : undefined;
    }
    case 'filters': {
      const filters = Array.isArray(params.filters) ? params.filters : [];
      const bucket = filters.find(
        (candidate) =>
          isRecord(candidate) &&
          isRecord(candidate.input) &&
          (candidate.label || candidate.input.query) === value
      );
      if (!isRecord(bucket) || !isRecord(bucket.input)) {
        return undefined;
      }
      const { query, language } = bucket.input;
      return (typeof query === 'string' || isRecord(query)) &&
        (language === 'kuery' || language === 'lucene')
        ? { query, language }
        : undefined;
    }
    case 'range': {
      if (!isRecord(value)) {
        return undefined;
      }
      const { gte, lt } = value;
      return {
        field,
        range: {
          ...(typeof gte === 'number' && Number.isFinite(gte) ? { gte } : {}),
          ...(typeof lt === 'number' && Number.isFinite(lt) ? { lt } : {}),
        },
      };
    }
    default:
      return undefined;
  }
};

/**
 * A range bucket's title, as Kibana's `range` format reads it: its label, or
 * its bounds in the column's Lens format, else the field format the table's
 * `range` wrapper carries, with Lens's `arrow_right` template and infinite
 * bounds as ∓∞.
 */
const rangeTitle = (
  value: JsonValue,
  planned: PlannedColumn,
  bound: BoundColumn,
  problems: Problems
): string => {
  if (!isRecord(value)) {
    return formatCell(value, undefined);
  }
  if (typeof value.label === 'string' && value.label) {
    return value.label;
  }
  const params = isRecord(planned.params) ? planned.params : {};
  const wrapper = bound.lens.meta?.params;
  const field =
    isRecord(wrapper) && wrapper.id === 'range' && isRecord(wrapper.params)
      ? { id: wrapper.params.id, params: wrapper.params.params }
      : undefined;
  const lens = toValueFormat(params);
  const mapped =
    lens.ok && !lens.format && field ? fromFieldFormat(field) : lens;
  if (!mapped.ok) {
    problems.add(
      'unsupported',
      'unsupported-format',
      `The "${mapped.id}" format of a range breakdown is not supported yet.`
    );
  }
  const parent =
    isRecord(params.parentFormat) && isRecord(params.parentFormat.params)
      ? params.parentFormat.params
      : {};
  const end = (edge: JsonValue | undefined, infinite: string) =>
    typeof edge === 'number' && Number.isFinite(edge)
      ? formatValue(edge, mapped.ok ? mapped.format : undefined)
      : parent.replaceInfinity === true
        ? infinite
        : formatCell(edge ?? null, undefined);
  const from = end(value.gte, '\u2212\u221E');
  const to = end(value.lt, '+\u221E');
  return parent.template === 'arrow_right'
    ? `${from} \u2192 ${to}`
    : `\u2265 ${from} and < ${to}`;
};

/**
 * Reads a date column as Kibana's date format does, `moment(value).format`
 * in the host's time zone; `undefined` for any other column.
 */
const dateReader = (
  { dates }: MetricBindContext,
  bound: BoundColumn | undefined,
  problems: Problems
): DateReader | undefined => {
  if (!bound || !isDate(bound)) {
    return undefined;
  }
  if (bound.type === 'date_nanos' || !dates) {
    problems.add(
      'unsupported',
      'unsupported-date',
      bound.type === 'date_nanos'
        ? `Nanosecond dates in column "${bound.lens.columnId}" are not supported yet.`
        : `Date column "${bound.lens.columnId}" needs the host's date format and time zone in \`dates\`.`
    );
    return () => '';
  }
  if (!isKnownTimeZone(dates.timeZone)) {
    problems.add(
      'unsupported',
      'unsupported-date',
      `The time zone "${dates.timeZone}" is not one moment-timezone knows.`,
      ['options', 'dates', 'timeZone']
    );
    return () => '';
  }
  const saved = bound.lens.meta?.params;
  const pattern =
    isRecord(saved) &&
    saved.id === 'date' &&
    isRecord(saved.params) &&
    typeof saved.params.pattern === 'string'
      ? saved.params.pattern
      : dates.format;
  const read: DateReader = (value) => {
    if (value === null || value === undefined) {
      return '(null)';
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value.map(read));
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      return formatCell(value, undefined);
    }
    return readDate(value, pattern, dates.timeZone) ?? String(value);
  };
  return read;
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
  // `hasIcon` and `resolveVisIcon`: the metric offers the icons in TILE_ICONS.
  const icon = state.icon && state.icon !== 'empty' ? state.icon : undefined;
  if (icon && !isTileIcon(icon)) {
    problems.add(
      'unsupported',
      'unsupported-icon',
      `"${icon}" is not one of the metric's icons.`,
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
  // A static max keeps the value its author set, so it collapses with `max`.
  const staticMax =
    plannedColumn(context, state.layerId, state.maxAccessor)?.operationType ===
    'static_value';
  const rows: readonly Row[] = canCollapse
    ? collapseRows(
        table.rows,
        [],
        [metric, secondary, max]
          .filter((bound): bound is BoundColumn => bound !== undefined)
          .map(({ index }) => ({
            index,
            fn: index === max?.index && staticMax ? 'max' : state.collapseFn!,
          }))
      )
    : table.rows;
  const breakdown = canCollapse ? undefined : breakdownColumn;
  const breakdownPlan = plannedColumn(
    context,
    state.layerId,
    breakdown?.lens.columnId
  );
  const labels = breakdown ? bucketLabels(breakdown, breakdownPlan) : {};
  const placeholders = breakdown
    ? Math.max(0, maxPossibleTiles(breakdownPlan) - rows.length)
    : 0;
  const tileRows: readonly Row[] = breakdown
    ? rows
    : rows.length
      ? rows.slice(0, 1)
      : [table.columns.map(() => null)];

  const metricDate = dateReader(context, metric, problems);
  const breakdownDate = dateReader(context, breakdown, problems);
  const format = columnFormat(metric, problems);
  // A range bucket's title formats its bounds itself.
  const breakdownFormat =
    breakdownPlan?.operationType === 'range'
      ? undefined
      : columnFormat(breakdown, problems);
  const trends = bindTrends(context, problems);
  const showingBar = Boolean(state.showBar && state.maxAccessor);
  const keys = new Map<string, number>();
  const metricExtent = extent(rows.map((r) => cell(r, metric)));

  const tiles = tileRows.map((row, rowIndex): MetricTile => {
    const raw = cell(row, metric);
    if (
      (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) ||
      (Array.isArray(raw) && raw.length === 0)
    ) {
      problems.add(
        'unsupported',
        'unsupported-multivalue',
        'An object or empty multivalue metric reading is not supported.',
        ['tables', state.layerId, 'rows', rowIndex]
      );
    }
    // `metricVis` formats each value of a multivalue reading.
    const reading = (each: JsonValue): number | string =>
      metricDate
        ? metricDate(each)
        : typeof each === 'number' || typeof each === 'string'
          ? each
          : formatCell(each, undefined);
    const value: MetricTile['value'] =
      metricDate && raw !== null && raw !== undefined && !Array.isArray(raw)
        ? metricDate(raw)
        : typeof raw === 'number' || typeof raw === 'string'
          ? raw
          : typeof raw === 'boolean'
            ? String(raw)
            : Array.isArray(raw) && raw.length > 0
              ? raw.map(reading)
              : null;
    const breakdownValue = cell(row, breakdown);
    const title = breakdown
      ? breakdownValue === '__other__' && labels.other
        ? labels.other
        : breakdownValue === MISSING && labels.missing
          ? labels.missing
          : breakdownPlan?.operationType === 'range'
            ? rangeTitle(
                breakdownValue ?? null,
                breakdownPlan,
                breakdown,
                problems
              )
            : breakdownDate
              ? breakdownDate(breakdownValue)
              : formatCell(breakdownValue ?? null, breakdownFormat)
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
      ...(format && (typeof value === 'number' || Array.isArray(value))
        ? { format }
        : {}),
      ...(icon && isTileIcon(icon) ? { icon } : {}),
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
      const filter = bucketFilter(
        breakdown,
        breakdownPlan,
        breakdownValue ?? null,
        rows
      );
      if (filter) {
        tile.action = { name: filterAction, filters: [filter] };
      } else {
        problems.add(
          'unsupported',
          'unsupported-filter-value',
          'Filtering by this breakdown bucket is not supported yet.'
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
    // `getEffectiveIconAlign`: an icon defaults left on legacy state.
    ...(icon ? { iconAlign: state.iconAlign ?? 'left' } : {}),
  };
  return {
    ok: true,
    node: {
      type: 'metric',
      tiles,
      ...(state.maxCols ? { columns: state.maxCols } : {}),
      ...(placeholders > 0 ? { placeholders } : {}),
      ...(Object.keys(layout).length ? { layout } : {}),
    },
  };
};
