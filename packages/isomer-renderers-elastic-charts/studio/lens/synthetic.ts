/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormLayerPlan,
  JsonValue,
  LensLayerPlan,
  LensPlan,
  LensResponseResult,
} from '@elastic/isomer-lowering-lens';
import { readResponse, readTable } from '@elastic/isomer-lowering-lens';

export const SYNTHETIC_LABEL =
  'Synthetic data: demonstrates lowering, binding, and presentation; does not execute or verify queries.';

/** The first synthetic bucket; times step forward from it, never from now. */
const EPOCH = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
const TIME_BUCKETS = 12;
const CATEGORIES = 3;
/** More rows than a preview needs; every bucket column multiplies them. */
export const MAX_SYNTHETIC_ROWS = 10_000;

/** FNV-1a, so each column's values follow from its identity and the seed. */
const hash = (text: string) => {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
};

/** mulberry32. */
const generator = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type Kind = 'category' | 'time' | 'number' | 'boolean';

interface Column {
  id: string;
  name: string;
  kind: Kind;
  /** A bucket column's values, in order. */
  buckets?: readonly JsonValue[];
  /** A fixed value, as a static value column has. */
  fixed?: number;
  percent?: boolean;
}

interface Options {
  seed: string;
  /** Columns that read as a maximum, such as a metric's max accessor, drawn above the rest. */
  maxColumns: ReadonlySet<string>;
}

const times = Array.from(
  { length: TIME_BUCKETS },
  (_, index) => EPOCH + index * DAY
);

const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPercent = (params: unknown) =>
  isRecord(params) && isRecord(params.format) && params.format.id === 'percent';

/** How many rows every combination of the bucket columns makes, counted before any is built. */
const rowCount = (columns: readonly Column[]) =>
  columns.reduce(
    (count, { buckets }) => (buckets ? count * buckets.length : count),
    1
  );

/** The rows of every combination of the bucket columns, and seeded values for the rest. */
const rows = (columns: readonly Column[], { seed, maxColumns }: Options) => {
  const buckets = columns.filter(({ buckets }) => buckets);
  let combinations: JsonValue[][] = [[]];
  for (const { buckets: values } of buckets) {
    combinations = combinations.flatMap((prefix) =>
      values!.map((value) => [...prefix, value])
    );
  }
  return combinations.map((combination, rowIndex) => {
    const bucketValues = new Map(
      buckets.map(({ id }, index) => [id, combination[index]!])
    );
    const metrics = columns.filter(({ buckets }) => !buckets);
    const values = new Map<string, JsonValue>();
    for (const column of metrics) {
      const random = generator(hash(`${seed}:${column.id}:${rowIndex}`));
      const trend = 1 + 0.08 * (rowIndex % TIME_BUCKETS);
      const value =
        column.fixed ??
        (column.kind === 'boolean'
          ? random() > 0.5
          : column.percent
            ? Math.round(random() * 1000) / 1000
            : Math.round((200 + random() * 800) * trend));
      values.set(column.id, value);
    }
    for (const column of metrics) {
      if (maxColumns.has(column.id) && column.fixed === undefined) {
        const largest = Math.max(
          ...metrics
            .filter(({ id }) => !maxColumns.has(id))
            .map(({ id }) => Number(values.get(id)) || 0)
        );
        values.set(column.id, Math.ceil((largest * 1.5) / 100) * 100);
      }
    }
    return columns.map(
      ({ id }) => bucketValues.get(id) ?? values.get(id) ?? null
    );
  });
};

const esqlColumns = ({ columns }: LensLayerPlan): Column[] =>
  columns.map(({ fieldName, meta, params }) => {
    const type = typeof meta?.type === 'string' ? meta.type : 'number';
    return type === 'date'
      ? {
          id: fieldName,
          name: fieldName,
          kind: 'time',
          buckets: times.map((time) => new Date(time).toISOString()),
        }
      : type === 'number'
        ? {
            id: fieldName,
            name: fieldName,
            kind: 'number',
            percent: isPercent(params),
          }
        : type === 'boolean'
          ? { id: fieldName, name: fieldName, kind: 'boolean' }
          : {
              id: fieldName,
              name: fieldName,
              kind: 'category',
              buckets: Array.from(
                { length: CATEGORIES },
                (_, index) => `Category ${String.fromCharCode(65 + index)}`
              ),
            };
  });

const referenced = (layer: FormLayerPlan) =>
  new Set(
    layer.columns.flatMap(({ references }) =>
      Array.isArray(references)
        ? references.filter((ref) => typeof ref === 'string')
        : []
    )
  );

const formColumns = (layer: FormLayerPlan): Column[] => {
  const parts = referenced(layer);
  return layer.columns
    .filter(({ columnId }) => !parts.has(columnId))
    .map((column): Column => {
      const { columnId: id, operationType, label } = column;
      const name = typeof label === 'string' ? label : id;
      const params = isRecord(column.params) ? column.params : {};
      switch (operationType) {
        case 'date_histogram':
          return { id, name, kind: 'time', buckets: times };
        case 'terms': {
          const size =
            typeof params.size === 'number'
              ? Math.min(params.size, CATEGORIES)
              : CATEGORIES;
          return {
            id,
            name,
            kind: 'category',
            buckets: [
              ...Array.from(
                { length: size },
                (_, index) => `Category ${String.fromCharCode(65 + index)}`
              ),
              ...(params.otherBucket === true ? ['__other__'] : []),
            ],
          };
        }
        case 'filters':
          return {
            id,
            name,
            kind: 'category',
            buckets: (Array.isArray(params.filters) ? params.filters : []).map(
              (filter) =>
                isRecord(filter) && isRecord(filter.input)
                  ? filter.label || filter.input.query || '*'
                  : '*'
            ),
          };
        case 'range':
          return {
            id,
            name,
            kind: 'category',
            buckets: (Array.isArray(params.ranges) ? params.ranges : []).map(
              (range) =>
                isRecord(range)
                  ? {
                      gte: range.from ?? null,
                      lt: range.to ?? null,
                      ...(range.label ? { label: range.label } : {}),
                    }
                  : null
            ),
          };
        case 'static_value':
          return { id, name, kind: 'number', fixed: Number(params.value) || 0 };
        default:
          return { id, name, kind: 'number', percent: isPercent(params) };
      }
    });
};

/**
 * One table per planned layer, from synthetic rows read back through the
 * same `readResponse` or `readTable` a host's real response goes through.
 */
export const synthesize = (
  plan: LensPlan,
  options: Options
): { layerId: string; result: LensResponseResult }[] =>
  plan.layers.map((layer) => {
    const tooMany = (count: number) => ({
      layerId: layer.layerId,
      result: {
        status: 'invalid' as const,
        diagnostics: [
          {
            code: 'studio.synthetic.too-many-rows',
            message: `Synthetic data for this layer would have ${count} rows, more than ${MAX_SYNTHETIC_ROWS}.`,
            path: ['layers', layer.layerId],
          },
        ],
      },
    });
    if (layer.kind === 'esql') {
      const columns = esqlColumns(layer);
      const unique = columns.filter(
        (column, index) =>
          columns.findIndex(({ id }) => id === column.id) === index
      );
      if (rowCount(unique) > MAX_SYNTHETIC_ROWS) {
        return tooMany(rowCount(unique));
      }
      return {
        layerId: layer.layerId,
        result: readResponse(layer, {
          columns: unique.map(({ id, kind }) => ({
            name: id,
            type:
              kind === 'time'
                ? 'date'
                : kind === 'category'
                  ? 'keyword'
                  : kind === 'boolean'
                    ? 'boolean'
                    : 'double',
          })),
          values: rows(unique, options),
        }),
      };
    }
    const columns = formColumns(layer);
    if (rowCount(columns) > MAX_SYNTHETIC_ROWS) {
      return tooMany(rowCount(columns));
    }
    return {
      layerId: layer.layerId,
      result: readTable(layer, {
        type: 'datatable',
        columns: columns.map(({ id, name, kind }) => ({
          id,
          name,
          meta: {
            type:
              kind === 'time' ? 'date' : kind === 'category' ? 'string' : kind,
          },
        })),
        rows: rows(columns, options).map((row) =>
          Object.fromEntries(columns.map(({ id }, index) => [id, row[index]!]))
        ),
      }),
    };
  });
