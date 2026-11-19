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

/** Keys a Vega-Lite named-data reference may carry; any other, such as `values` or `url`, makes it a source of its own. */
const NAMED_DATA_KEYS = new Set(['name', 'format']);

/** Whether `data` is a Vega-Lite reference to the `table` dataset, not a source that defines its own rows. */
const isTableReference = (data: unknown): boolean =>
  isSpecObject(data) &&
  data.name === TABLE_DATASET &&
  Object.keys(data).every((key) => NAMED_DATA_KEYS.has(key));

/**
 * Where a Vega-Lite spec, at any depth outside inline rows, reads `table`, and the path of the first `data` named
 * `table` that is a source of its own.
 */
const vegaLiteTableUse = (
  value: unknown,
  path: Path = [],
  use: { reads: boolean; conflict?: Path } = { reads: false }
): { reads: boolean; conflict?: Path } => {
  if (path.length > 64 || use.conflict) {
    return use;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      vegaLiteTableUse(item, [...path, index], use)
    );
    return use;
  }
  if (!isSpecObject(value)) {
    return use;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === 'data') {
      if (isTableReference(child)) {
        use.reads = true;
      } else if (isSpecObject(child) && child.name === TABLE_DATASET) {
        use.conflict ??= [...path, key];
      }
    } else if (key !== 'values' && key !== 'datasets') {
      vegaLiteTableUse(child, [...path, key], use);
    }
  }
  return use;
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
  const { reads, conflict } = vegaLiteTableUse(spec);
  if (conflict) {
    return { path: ['spec', ...conflict], message: TABLE_RULE };
  }
  return reads ? undefined : { path: ['spec'], message: TABLE_RULE };
};

/** The cross-field rule `data` is held to, as the authoring schema states it. */
export const TABLE_RULE =
  'With `data`, the spec reads it as the dataset named `table`: a Vega spec declares `{ "name": "table" }` in `data` with no `values`, `url` or `source`, and a Vega-Lite spec reads `"data": { "name": "table" }`, with no rows or source of its own, and declares no `datasets.table`.';

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
