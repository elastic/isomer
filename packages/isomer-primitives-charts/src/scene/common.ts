/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coordinateOf, scalarOf } from '../coordinates';
import { defaultFormatFor, formatValue } from '../format/format';
import type { Cell, ChartColumn, ChartData, ColumnType } from '../schema/data';
import type { Emphasis, SelectTarget } from '../schema/events';
import type { PortableFormat } from '../schema/format';

import { CHART_CHROME } from './theme';
import type {
  ColorScheme,
  SceneChrome,
  SceneInteractions,
  SceneSize,
  SceneTable,
} from './types';

/** What the host draws a Scene for, passed to `resolveChart`. */
export interface ResolveChartOptions {
  /** The scheme every color in the Scene is concrete for. */
  scheme: ColorScheme;
  /** The size the host draws the Scene at, passed through. */
  size?: SceneSize | undefined;
  /** Absent means `en`. */
  locale?: string | undefined;
  /** IANA time zone for dates whose format names none. Absent means `UTC`. */
  timeZone?: string | undefined;
}

/** What every resolver step reads: the options, resolved, and the node's data. */
export interface Resolution {
  readonly scheme: ColorScheme;
  readonly size?: SceneSize;
  readonly locale: string;
  readonly timeZone: string;
  readonly chrome: SceneChrome;
  readonly data: ChartData;
  column(id: string): ChartColumn;
  cell(id: string, row: number): Cell;
  /** A cell's identity for grouping and matching: a scalar date by its instant, anything else by {@link cellKey}. */
  identity(id: string, row: number): string;
  /** The column's format, or the default for its type. */
  format(id: string): PortableFormat;
  /** A value formatted with `format`. */
  formatAs(value: Cell | undefined, format: PortableFormat): string;
  /** A cell as displayed: its `display` string, or its value formatted. */
  text(id: string, row: number): string;
  /** A value formatted as the column formats its cells. */
  valueText(id: string, value: Cell | undefined): string;
}

/** The {@link Resolution} of `data` under `options`. */
export const createResolution = (
  data: ChartData,
  { scheme, size, locale = 'en', timeZone = 'UTC' }: ResolveChartOptions
): Resolution => {
  const formatAs = (value: Cell | undefined, format: PortableFormat) =>
    formatValue(value, format, { locale, timeZone, missing: data.missing });
  const byId = new Map(data.columns.map((column, index) => [column.id, index]));
  const index = (id: string) => {
    const found = byId.get(id);
    if (found === undefined) {
      throw new RangeError(`No column is "${id}"`);
    }
    return found;
  };
  const column = (id: string) => data.columns[index(id)]!;
  const format = (id: string) => {
    const { format: own, type } = column(id);
    return own ?? defaultFormatFor(type);
  };
  const cell = (id: string, row: number): Cell =>
    data.rows[row]?.[index(id)] ?? null;
  return {
    scheme,
    ...(size ? { size } : {}),
    locale,
    timeZone,
    chrome: CHART_CHROME[scheme],
    data,
    column,
    cell,
    identity: (id, row) => cellIdentity(cell(id, row), column(id).type),
    format,
    formatAs,
    text: (id, row) =>
      data.display?.[id]?.[row] ?? formatAs(cell(id, row), format(id)),
    valueText: (id, value) => formatAs(value, format(id)),
  };
};

const isEmpty = (cell: Cell | undefined) =>
  cell === null ||
  cell === undefined ||
  cell === '' ||
  (Array.isArray(cell) && cell.length === 0);

const buildTable = (resolution: Resolution): SceneTable => {
  const { data } = resolution;
  return {
    columns: data.columns.map(({ id, label, type, role }, index) => ({
      id,
      label,
      type,
      role,
      empty: data.rows.every((row) => isEmpty(row[index])),
    })),
    rows: data.rows.map((cells, row) => ({
      row,
      cells: data.columns.map(({ id }) => resolution.text(id, row)),
      values: cells,
    })),
  };
};

interface InteractionsInput {
  interactions?:
    | {
        select?: readonly SelectTarget[] | undefined;
        brush?: { column: string } | undefined;
        sync?:
          | { cursor?: boolean | undefined; tooltips?: boolean | undefined }
          | undefined;
        link?: { href: string; label: string } | undefined;
      }
    | undefined;
  emphasis?: Emphasis | undefined;
}

/** The node's interactions, with defaults filled in. */
export const resolveInteractions = ({
  interactions,
  emphasis,
}: InteractionsInput): SceneInteractions => ({
  select: [...(interactions?.select ?? [])],
  ...(interactions?.brush
    ? { brush: { column: interactions.brush.column } }
    : {}),
  sync: {
    cursor: interactions?.sync?.cursor ?? false,
    tooltips: interactions?.sync?.tooltips ?? false,
  },
  ...(interactions?.link
    ? { link: { href: interactions.link.href, label: interactions.link.label } }
    : {}),
  emphasis: (emphasis ?? []).map(({ rows, note }) => ({
    rows: [...rows],
    ...(note === undefined ? {} : { note }),
  })),
});

/** `label: value` pairs joined as a selection's description reads. */
export const describe = (
  parts: readonly (readonly [string, string])[]
): string => parts.map(([label, value]) => `${label}: ${value}`).join(' · ');

/** A cell's finite number, or `undefined` when it has none. */
export const toNumber = (cell: Cell | undefined): number | undefined => {
  const value = scalarOf(cell);
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
};

/** The value `percent` of the way from `low` to `high`, even where their span overflows. */
export const percentAlong = (
  low: number,
  high: number,
  percent: number
): number => {
  const exact = low + ((high - low) * percent) / 100;
  if (Number.isFinite(exact)) {
    return exact;
  }
  const share = percent / 100;
  return low * (1 - share) + high * share;
};

/** Where `value` lies from `low` (0) to `high` (1), even where their span overflows. */
export const fractionAlong = (
  low: number,
  high: number,
  value: number
): number => {
  const span = high - low;
  return Number.isFinite(span)
    ? (value - low) / span
    : (value / 2 - low / 2) / (high / 2 - low / 2);
};

/** The least double above `value`. */
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

/** The fields every Scene kind shares. */
export const sceneBase = (
  resolution: Resolution,
  node: { title?: string | undefined; description?: string | undefined }
) => ({
  scheme: resolution.scheme,
  ...(resolution.size ? { size: resolution.size } : {}),
  locale: resolution.locale,
  timeZone: resolution.timeZone,
  ...(node.title === undefined ? {} : { title: node.title }),
  ...(node.description === undefined ? {} : { description: node.description }),
  chrome: resolution.chrome,
  table: buildTable(resolution),
});

/** "Title: sentence", or the sentence alone without a title. */
export const titled = (title: string | undefined, sentence: string) =>
  title
    ? `${title}: ${sentence}`
    : sentence.charAt(0).toUpperCase() + sentence.slice(1);

const escapeKey = (text: string) => text.replace(/[\\:]/g, '\\$&');

/** The documented color/series key encoding. No string produces `\null` or a leading `\[`. */
export const keyPart = (cell: Cell): string =>
  cell === null
    ? '\\null'
    : Array.isArray(cell)
      ? `\\${escapeKey(JSON.stringify(cell))}`
      : escapeKey(String(cell));

/** Raw cell identity, independent of display text and scalar/array encoding. */
export const cellKey = (cell: Cell): string => JSON.stringify(cell);

/** A cell's identity in a column of `type`: a scalar date by its instant, anything else by {@link cellKey}. */
export const cellIdentity = (value: Cell, type: ColumnType): string => {
  const instant =
    type === 'date' && !Array.isArray(value)
      ? coordinateOf(value, 'temporal')
      : undefined;
  return instant === undefined ? cellKey(value) : `@${instant}`;
};
