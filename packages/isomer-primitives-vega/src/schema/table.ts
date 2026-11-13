/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A node's `data` reaches its spec as the dataset named `table`: rows as
// objects keyed by column id, dates as epoch milliseconds.

import type { Cell, ChartData } from '@elastic/isomer-primitives-charts/schema';

import { isSpecObject, setOwn, type SpecObject } from './spec';

/** The name a spec reads a node's `data` by. */
export const TABLE_DATASET = 'table';

export type VegaMode = 'vega' | 'vega-lite';

type Path = (string | number)[];

const toEpoch = (value: Cell): Cell => {
  if (Array.isArray(value)) {
    return value.map((item) => toEpoch(item) as Exclude<Cell, unknown[]>);
  }
  if (typeof value !== 'string') {
    return value;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : time;
};

/** `data.rows` as the objects Vega reads, one per row, keyed by column id. */
export const tableRows = ({ columns, rows }: ChartData): SpecObject[] =>
  rows.map((row) => {
    const object: SpecObject = {};
    columns.forEach(({ id, type }, index) => {
      const cell = row[index] ?? null;
      setOwn(object, id, type === 'date' ? toEpoch(cell) : cell);
    });
    return object;
  });

/** Where a Vega spec declares `table` in its top-level `data`, or `undefined`. */
const vegaTableIndex = (spec: SpecObject): number | undefined => {
  const data = Array.isArray(spec.data) ? spec.data : [];
  const index = data.findIndex(
    (entry) => isSpecObject(entry) && entry.name === TABLE_DATASET
  );
  return index < 0 ? undefined : index;
};

/** Every `data: { name: 'table' }` in a Vega-Lite spec, at any depth outside inline rows. */
const readsVegaLiteTable = (value: unknown, depth = 0): boolean => {
  if (depth > 64) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => readsVegaLiteTable(item, depth + 1));
  }
  if (!isSpecObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, child]) =>
    key === 'data'
      ? isSpecObject(child) && child.name === TABLE_DATASET
      : key !== 'values' &&
        key !== 'datasets' &&
        readsVegaLiteTable(child, depth + 1)
  );
};

/** Where `data` cannot bind into `spec`, with the path and the reason. */
export const tableBindingIssue = (
  mode: VegaMode,
  spec: SpecObject
): { path: Path; message: string } | undefined => {
  if (mode === 'vega') {
    const index = vegaTableIndex(spec);
    if (index === undefined) {
      return { path: ['spec', 'data'], message: TABLE_RULE };
    }
    const entry = (spec.data as SpecObject[])[index]!;
    const filled = ['values', 'url', 'source'].find((key) => key in entry);
    return filled === undefined
      ? undefined
      : { path: ['spec', 'data', index, filled], message: TABLE_RULE };
  }
  if (isSpecObject(spec.datasets) && TABLE_DATASET in spec.datasets) {
    return { path: ['spec', 'datasets', TABLE_DATASET], message: TABLE_RULE };
  }
  return readsVegaLiteTable(spec)
    ? undefined
    : { path: ['spec'], message: TABLE_RULE };
};

/** The cross-field rule `data` is held to, as the authoring schema states it. */
export const TABLE_RULE =
  'With `data`, the spec reads it as the dataset named `table`: a Vega spec declares `{ "name": "table" }` in `data` with no `values`, `url` or `source`, and a Vega-Lite spec reads `"data": { "name": "table" }` and declares no `datasets.table`.';

/** `spec` with `data`'s rows in its `table` dataset. */
export const bindTable = (
  mode: VegaMode,
  spec: SpecObject,
  data: ChartData
): SpecObject => {
  const rows = tableRows(data);
  if (mode === 'vega-lite') {
    const datasets = isSpecObject(spec.datasets) ? spec.datasets : {};
    return { ...spec, datasets: { ...datasets, [TABLE_DATASET]: rows } };
  }
  const index = vegaTableIndex(spec);
  if (index === undefined) {
    return spec;
  }
  const entries = [...(spec.data as unknown[])];
  entries[index] = { ...(entries[index] as SpecObject), values: rows };
  return { ...spec, data: entries };
};
