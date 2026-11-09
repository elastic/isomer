/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Vega gestures as chart events: a click on a mark selects the rows of
// `data` sharing its datum's dimension values, and a brush signal's
// `[from, to]` brushes a column. Events refer to `data`, never to pixels.

import type {
  Cell,
  ChartBrushEvent,
  ChartData,
  ChartSelectEvent,
} from '@elastic/isomer-primitives-charts/schema';

import type { VegaNode } from './schema/node';
import { formatColumnValues } from './table_text';

/** A cell as Vega holds it: dates as epoch milliseconds, so values compare. */
const comparable = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? value : time;
  }
  return value;
};

const sameCell = (
  column: ChartData['columns'][number],
  a: unknown,
  b: unknown
) =>
  column.type === 'date'
    ? comparable(a) === comparable(b)
    : a === b || (a === null && b === undefined);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const describe = (data: ChartData, values: Record<string, Cell>): string =>
  Object.entries(values)
    .map(([id, value]) => {
      const label =
        data.columns.find((column) => column.id === id)?.label ?? id;
      return `${label}: ${formatColumnValues(data, id, [value])[0]}`;
    })
    .join(' · ');

/**
 * The `mark` selection a click on `datum` raises: every row sharing the
 * datum's values in the dimension columns it carries. `undefined` when the
 * node offers no `mark` selection, has no `id` or `data`, or the datum
 * carries no dimension column or matches no row.
 */
export const markSelectEvent = (
  node: VegaNode,
  datum: unknown
): ChartSelectEvent | undefined => {
  const { data, id } = node;
  if (
    !data ||
    id === undefined ||
    !node.interactions?.select?.includes('mark') ||
    !isRecord(datum)
  ) {
    return undefined;
  }
  const columns = data.columns.filter(
    ({ id: column, role, multivalue }) =>
      role === 'dimension' && !multivalue && column in datum
  );
  if (columns.length === 0) {
    return undefined;
  }
  const indexes = data.columns.map(({ id: column }) => column);
  const rows = data.rows.flatMap((row, index) =>
    columns.every((column) =>
      sameCell(column, row[indexes.indexOf(column.id)], datum[column.id])
    )
      ? [index]
      : []
  );
  const [first] = rows;
  if (first === undefined) {
    return undefined;
  }
  const values = Object.fromEntries(
    columns.map(({ id: column }) => [
      column,
      data.rows[first]![indexes.indexOf(column)] ?? null,
    ])
  ) as Record<string, Cell>;
  return {
    kind: 'select',
    target: 'mark',
    node: id,
    rows,
    columns: columns.map(({ id: column }) => column),
    values,
    description: describe(data, values),
  };
};

/**
 * The brush a new value of the `interactions.brush` signal raises, or
 * `undefined` for a value that is not two finite numbers or dates.
 */
export const signalBrushEvent = (
  node: VegaNode,
  value: unknown
): ChartBrushEvent | undefined => {
  const { data, id } = node;
  const brush = node.interactions?.brush;
  if (!data || !brush || id === undefined || !Array.isArray(value)) {
    return undefined;
  }
  const range = value.map(comparable);
  const [from, to] = range;
  if (
    range.length !== 2 ||
    typeof from !== 'number' ||
    typeof to !== 'number' ||
    !Number.isFinite(from) ||
    !Number.isFinite(to)
  ) {
    return undefined;
  }
  const ordered: [number, number] = from <= to ? [from, to] : [to, from];
  const label =
    data.columns.find(({ id: column }) => column === brush.column)?.label ??
    brush.column;
  const [low, high] = formatColumnValues(data, brush.column, ordered);
  return {
    kind: 'brush',
    node: id,
    column: brush.column,
    range: ordered,
    values: {},
    description: `${label}: ${low} to ${high}`,
  };
};
