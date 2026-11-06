/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lens's data table (`lens/public/visualizations/datatable`), resolved: the
// table's missing-value text, its default alignments, cell decorations and
// bar domains, the `@kbn/sort-predicates` orderings and the summary row.

import { toEpoch } from '../format/date';
import {
  DEFAULT_FORMATS,
  EMPTY_LABEL,
  formatValue,
  NULL_LABEL,
} from '../format/format';
import type { ChartColors } from '../schema/colors';
import type { Cell, ColumnType, ScalarCell } from '../schema/data';
import type {
  DataTableColumn,
  DataTableNode,
  DataTableSummary,
} from '../schema/data_table';
import type { PortableFormat } from '../schema/format';

import {
  createResolution,
  describe,
  keyPart,
  type Resolution,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
} from './common';
import { bandFor } from './resolve_metric';
import {
  contrastText,
  DEFAULT_TABLE_BAR_COLOR,
  resolveColor,
  TABLE_CHROME,
} from './theme';
import type {
  ColorScheme,
  SceneColor,
  TableAlignment,
  TableCell,
  TableColumn,
  TableOrder,
  TableRow,
  TableScene,
} from './types';

/** Kibana's dash for a missing value in a table (`NULL_PLACEHOLDER`). */
export const TABLE_MISSING_TEXT = '-';

/** Lens's empty table message (`charts.noDataLabel`). */
export const TABLE_EMPTY_TEXT = 'No results found';

/** Lens's summary labels (`getSummaryRowOptions`). */
export const SUMMARY_LABELS: Readonly<Record<DataTableSummary, string>> = {
  count: 'Value count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
};

const COUNT_FORMAT: PortableFormat = DEFAULT_FORMATS.number;

type Direction = 'asc' | 'desc';

// `@kbn/sort-predicates`: null, undefined and NaN are invalid.
const isInvalid = (value: unknown): value is null | undefined =>
  value === null ||
  value === undefined ||
  (typeof value === 'number' && Number.isNaN(value));

const invalidOrder = (a: unknown, b: unknown): number | undefined => {
  if (isInvalid(a)) {
    return isInvalid(b) ? 0 : -1;
  }
  return isInvalid(b) ? 1 : undefined;
};

type Compare = (a: ScalarCell | undefined, b: ScalarCell | undefined) => number;

const comparatorFor = (
  type: ColumnType,
  format: PortableFormat,
  locale: string
): Compare => {
  switch (type) {
    case 'number':
      return (a, b) => invalidOrder(a, b) ?? (a as number) - (b as number);
    case 'date':
      return (a, b) => {
        const x = isInvalid(a) ? undefined : toEpoch(a);
        const y = isInvalid(b) ? undefined : toEpoch(b);
        if (x === undefined) {
          return y === undefined ? 0 : -1;
        }
        if (y === undefined) {
          return 1;
        }
        return x === y ? 0 : x < y ? -1 : 1;
      };
    case 'string':
    case 'boolean':
      return (a, b) =>
        invalidOrder(a, b) ??
        formatValue(a ?? null, format).localeCompare(
          formatValue(b ?? null, format),
          locale
        );
  }
};

/** Rows in `direction`, as `getSortingCriteria` orders them; ties keep `data` order. */
const sortRows = (
  cells: readonly Cell[],
  compare: Compare,
  direction: Direction
): number[] => {
  const factor = direction === 'asc' ? 1 : -1;
  const rowCompare = (a: Cell, b: Cell): number => {
    // A missing cell is last in either direction.
    if (isInvalid(a)) {
      return isInvalid(b) ? 0 : 1;
    }
    if (isInvalid(b)) {
      return -1;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      const left = Array.isArray(a) ? a : [a];
      const right = Array.isArray(b) ? b : [b];
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const result = compare(left[i], right[i]);
        if (result !== 0) {
          return factor * result;
        }
      }
      return 0;
    }
    return factor * compare(a, b);
  };
  return cells
    .map((_, index) => index)
    .sort((x, y) => rowCompare(cells[x]!, cells[y]!));
};

const isEmptyCell = (cell: Cell | undefined) =>
  cell === null ||
  cell === undefined ||
  cell === '' ||
  (Array.isArray(cell) && cell.length === 0);

const keyColor = (
  colors: ChartColors | undefined,
  value: ScalarCell,
  scheme: ColorScheme
): SceneColor | undefined => {
  if (!colors || value === null) {
    return undefined;
  }
  if (typeof value === 'number' && colors.bands) {
    const band = bandFor(colors.bands, value);
    if (band) {
      return resolveColor(band.color, scheme);
    }
  }
  const byKey = colors.byKey?.[keyPart(value)];
  return byKey ? resolveColor(byKey, scheme) : undefined;
};

/** A bar's `[min, max]`, as Lens's `getProgressBarDomain`. */
const barDomain = (
  decoration: Extract<DataTableColumn['decoration'], { kind: 'bar' }>,
  values: readonly number[]
): [number, number] => {
  // Lens's `getFallbackDataBounds` when the column holds no number.
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 100;
  const custom = decoration.min !== undefined || decoration.max !== undefined;
  let min = decoration.min ?? low;
  let max = decoration.max ?? high;
  if (min > max) {
    [min, max] = [max, min];
  }
  if (min === max) {
    if (custom) {
      max = min + 1;
    } else if (min > 0) {
      min = 0;
    } else if (max < 0) {
      max = 0;
    } else {
      max = min + 1;
    }
  }
  return [min, max];
};

/** A summary over every non-null value, arrays flattened, as Lens's `computeFinalValue`. */
const summarize = (kind: DataTableSummary, cells: readonly Cell[]): number => {
  const values = cells
    .filter((cell) => cell !== null && cell !== undefined)
    .flat() as number[];
  const sum = values.reduce((total, value) => total + value, 0);
  switch (kind) {
    case 'sum':
      return sum;
    case 'count':
      return values.length;
    case 'avg':
      return sum / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
  }
};

const footerText = (
  resolution: Resolution,
  id: string,
  summary: NonNullable<DataTableColumn['summary']>
): string => {
  const value = summarize(
    summary.kind,
    resolution.data.rows.map((_, row) => resolution.cell(id, row))
  );
  const text = formatValue(
    value,
    summary.kind === 'count' ? COUNT_FORMAT : resolution.format(id)
  );
  const label = summary.label ?? SUMMARY_LABELS[summary.kind];
  return label === '' ? text : `${label}: ${text}`;
};

// EUI's data grid pager: "Rows per page: {n}" and one number per page.
const pagingOf = (pageSize: number, rowCount: number) => {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  return {
    pageSize,
    pageCount,
    rowsPerPage: `Rows per page: ${pageSize}`,
    pageLabels: Array.from({ length: pageCount }, (_, page) =>
      String(page + 1)
    ),
  };
};

const list = (labels: readonly string[]) =>
  labels.length <= 2
    ? labels.join(' and ')
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;

/** The Scene of a `dataTable` node. */
export const resolveTable = (
  node: DataTableNode,
  options: ResolveChartOptions
): TableScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme } = resolution;
  const palette = TABLE_CHROME[scheme];
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('cell');

  const settings: readonly DataTableColumn[] =
    node.columns ?? data.columns.map(({ id }) => ({ column: id }));

  const cellsOf = (id: string) =>
    data.rows.map((_, row) => resolution.cell(id, row));

  const columns = settings.map(
    ({ column: id, alignment, width, summary, decoration }): TableColumn => {
      const { label, type, role } = resolution.column(id);
      const natural: TableAlignment =
        alignment ?? (type === 'number' ? 'right' : 'left');
      return {
        id,
        label,
        type,
        role,
        empty: cellsOf(id).every(isEmptyCell),
        // Lens's `getSupportedColumnAlignment`: a bar is never centered.
        alignment:
          decoration?.kind === 'bar' && natural === 'center'
            ? 'right'
            : natural,
        ...(width === undefined ? {} : { width }),
        ...(summary ? { footer: footerText(resolution, id, summary) } : {}),
      };
    }
  );

  const domains = new Map(
    settings.flatMap(({ column: id, decoration }) =>
      decoration?.kind === 'bar'
        ? [
            [
              id,
              barDomain(
                decoration,
                cellsOf(id).filter(
                  (cell): cell is number => typeof cell === 'number'
                )
              ),
            ] as const,
          ]
        : []
    )
  );

  const emphasis = new Map<number, string>();
  for (const { rows, note } of interactions.emphasis) {
    for (const row of rows) {
      emphasis.set(row, note ?? emphasis.get(row) ?? '');
    }
  }

  const nullText = data.missing?.null ?? NULL_LABEL;
  const blankText = data.missing?.empty ?? EMPTY_LABEL;
  const cellOf = (setting: DataTableColumn, row: number): TableCell => {
    const id = setting.column;
    const column = resolution.column(id);
    const raw = resolution.cell(id, row);
    const display = data.display?.[id]?.[row];
    const missing =
      display === undefined && (raw === null || raw === undefined);
    const blank = display === undefined && raw === '';
    const text = missing
      ? TABLE_MISSING_TEXT
      : blank
        ? blankText
        : resolution.text(id, row);
    const description = describe([[column.label, missing ? nullText : text]]);
    const selection =
      selectable && column.role === 'dimension'
        ? {
            target: 'cell' as const,
            rows: [row],
            columns: [id],
            values: { [id]: raw },
            description,
          }
        : undefined;
    const base = {
      source: { rows: [row], columns: [id] },
      text,
      description,
      ...(selection ? { selection } : {}),
    };
    if (missing || blank) {
      return {
        ...base,
        empty: missing ? 'missing' : 'blank',
        ...(missing ? { title: nullText } : {}),
        color: palette.emptyValue,
      };
    }
    const decoration = setting.decoration;
    const scalar = Array.isArray(raw) ? undefined : raw;
    if (!decoration || scalar === undefined) {
      return { ...base, color: chrome.text };
    }
    if (decoration.kind === 'bar') {
      const domain = domains.get(id);
      if (typeof scalar !== 'number' || !domain) {
        return { ...base, color: chrome.text };
      }
      const [min, max] = domain;
      const clamp = (value: number) => Math.min(max, Math.max(min, value));
      const at = (value: number) => (clamp(value) - min) / (max - min);
      const baseline = decoration.baseline ?? 0;
      return {
        ...base,
        color: chrome.text,
        bar: {
          from: Math.min(at(baseline), at(scalar)),
          to: Math.max(at(baseline), at(scalar)),
          color:
            keyColor(decoration.colors, scalar, scheme) ??
            (decoration.color
              ? resolveColor(decoration.color, scheme)
              : DEFAULT_TABLE_BAR_COLOR),
          track: palette.barTrack,
        },
      };
    }
    const color = keyColor(decoration.colors, scalar, scheme);
    if (color === undefined) {
      return { ...base, color: chrome.text };
    }
    switch (decoration.kind) {
      case 'text':
        return { ...base, color };
      case 'background':
        return {
          ...base,
          background: color,
          color: contrastText(color, scheme),
        };
      case 'badge':
        return { ...base, badge: color, color: contrastText(color, scheme) };
    }
  };

  const rows = data.rows.map((_, row): TableRow => ({
    row,
    cells: settings.map((setting) => cellOf(setting, row)),
    ...(emphasis.has(row) ? { emphasis: emphasis.get(row)! } : {}),
  }));

  const sort = node.interactions?.initial?.sort;
  const orders: Record<string, TableOrder> = {};
  for (const id of new Set([
    ...settings.map(({ column }) => column),
    ...(sort ? [sort.column] : []),
  ])) {
    const { type } = resolution.column(id);
    const compare = comparatorFor(
      type,
      resolution.format(id),
      resolution.locale
    );
    const cells = cellsOf(id);
    orders[id] = {
      asc: sortRows(cells, compare, 'asc'),
      desc: sortRows(cells, compare, 'desc'),
    };
  }
  const order = sort
    ? orders[sort.column]![sort.direction]
    : rows.map((_, index) => index);

  const rowHeader = columns.find(({ role }) => role === 'dimension')?.id;
  const dimensions = columns.filter(({ role }) => role === 'dimension');
  const metrics = columns.filter(({ role }) => role === 'metric');
  const count = `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`;
  const measured = metrics.length
    ? ` of ${list(metrics.map(({ label }) => label))}`
    : '';
  const by = dimensions.length
    ? ` by ${list(dimensions.map(({ label }) => label))}`
    : '';
  const sentence = rows.length === 0 ? 'no rows.' : `${count}${measured}${by}.`;

  const base = sceneBase(resolution, node);
  return {
    kind: 'table',
    ...base,
    // The table, as text surfaces read it: the columns shown, in order.
    table: {
      columns: columns.map(({ id, label, type, role, empty }) => ({
        id,
        label,
        type,
        role,
        empty,
      })),
      rows: rows.map(({ row, cells }) => ({
        row,
        cells: cells.map(({ text }) => text),
        values: columns.map(({ id }) => resolution.cell(id, row) ?? null),
      })),
    },
    summary: titled(node.title, sentence),
    interactions,
    columns,
    ...(rowHeader === undefined ? {} : { rowHeader }),
    rows,
    ...(sort
      ? { sort: { column: sort.column, direction: sort.direction } }
      : {}),
    order,
    orders,
    ...(node.pageSize === undefined
      ? {}
      : { paging: pagingOf(node.pageSize, rows.length) }),
    density: node.density ?? 'default',
    emptyText: TABLE_EMPTY_TEXT,
    headerBackground: palette.header,
  };
};
