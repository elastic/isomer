/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultFormatFor, formatValue } from '../format/format';
import type { Cell, ChartColumn, ChartData } from '../schema/data';
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

export interface ResolveChartOptions {
  scheme: ColorScheme;
  /** The size ticks and layout are chosen for. */
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
  index(id: string): number;
  cell(id: string, row: number): Cell;
  /** The column's format, or the default for its type. */
  format(id: string): PortableFormat;
  /** A value formatted with `format`. */
  formatAs(value: Cell | undefined, format: PortableFormat): string;
  /** A cell as displayed: its `display` string, or its value formatted. */
  text(id: string, row: number): string;
  /** A value formatted as the column formats its cells. */
  valueText(id: string, value: Cell | undefined): string;
}

export const createResolution = (
  data: ChartData,
  { scheme, size, locale = 'en', timeZone = 'UTC' }: ResolveChartOptions
): Resolution => {
  const formatAs = (value: Cell | undefined, format: PortableFormat) =>
    formatValue(value, format, { locale, timeZone });
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
    index,
    cell,
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

export const buildTable = (resolution: Resolution): SceneTable => {
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

export const toNumber = (cell: Cell | undefined): number | undefined =>
  typeof cell === 'number' && Number.isFinite(cell) ? cell : undefined;

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

/** The documented color/series key encoding. */
export const keyPart = (cell: Cell): string =>
  cell === null
    ? '\\null'
    : (Array.isArray(cell) ? JSON.stringify(cell) : String(cell)).replace(
        /[\\:]/g,
        '\\$&'
      );

/** Raw cell identity, independent of display text and scalar/array encoding. */
export const cellKey = (cell: Cell): string => JSON.stringify(cell);
