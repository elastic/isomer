/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { JsonValue } from '../json';

// Lens's persisted form-based state, read as a format specification:
// `@kbn/lens-common/datasources/{types,operations}.ts`. These schemas check the
// fields planning reads; a plan carries each saved column verbatim.

const json = z.custom<JsonValue>(() => true);
const id = z.string().min(1).max(4096);
const params = <T extends z.ZodRawShape>(shape: T) => z.object(shape);

export const querySchema = z
  .object({
    query: z.union([z.string(), z.record(z.string(), json)]),
    language: z.enum(['kuery', 'lucene']),
  })
  .strict();

const format = z
  .object({ id, params: z.record(z.string(), json).optional() })
  .catchall(json);

const base = {
  label: z.string().max(4096),
  dataType: id,
  isBucketed: z.boolean(),
  customLabel: z.boolean().optional(),
  timeScale: z.enum(['s', 'm', 'h', 'd']).optional(),
  filter: querySchema.optional(),
  reducedTimeRange: id.optional(),
  timeShift: id.optional(),
};
const field = { ...base, sourceField: id };
const referenced = { ...base, references: z.array(id) };
/** Lens's reference-based operations each read exactly one column. */
const operand = { ...base, references: z.array(id).length(1) };
const formatted = params({ format: format.optional() }).optional();

const column = <T extends string, S extends z.ZodRawShape>(
  operationType: T,
  shape: S
) => z.object({ operationType: z.literal(operationType), ...shape });

const metric = <T extends string>(operationType: T) =>
  column(operationType, {
    ...field,
    params: params({
      emptyAsNull: z.boolean().optional(),
      format: format.optional(),
    }).optional(),
  });

const reference = <T extends string>(operationType: T) =>
  column(operationType, { ...operand, params: formatted });

export const formColumnSchema = z.discriminatedUnion('operationType', [
  metric('count'),
  metric('unique_count'),
  metric('sum'),
  metric('average'),
  metric('min'),
  metric('max'),
  metric('median'),
  metric('standard_deviation'),
  column('percentile', {
    ...field,
    params: params({ percentile: z.number(), format: format.optional() }),
  }),
  column('percentile_rank', {
    ...field,
    params: params({ value: z.number(), format: format.optional() }),
  }),
  column('last_value', {
    ...field,
    params: params({
      sortField: id,
      showArrayValues: z.boolean(),
      format: format.optional(),
    }),
  }),
  column('static_value', {
    ...referenced,
    params: params({ value: z.string().optional(), format: format.optional() }),
  }),
  column('formula', {
    ...referenced,
    params: params({
      formula: z.string().optional(),
      isFormulaBroken: z.boolean().optional(),
      format: format.optional(),
    }),
  }),
  column('math', {
    ...referenced,
    params: params({ tinymathAst: json.optional(), format: format.optional() }),
  }),
  reference('overall_sum'),
  reference('overall_min'),
  reference('overall_max'),
  reference('overall_average'),
  reference('cumulative_sum'),
  reference('differences'),
  reference('counter_rate'),
  column('moving_average', {
    ...operand,
    params: params({
      window: z.number().int().positive(),
      format: format.optional(),
    }),
  }),
  column('normalize_by_unit', {
    ...operand,
    params: params({ unit: z.string().optional(), format: format.optional() }),
  }),
  column('time_range', referenced),
  column('now', referenced),
  column('interval', referenced),
  column('terms', {
    ...field,
    params: params({
      size: z.number().int().positive(),
      orderBy: z.record(z.string(), json),
      orderDirection: z.enum(['asc', 'desc']),
      otherBucket: z.boolean().optional(),
      missingBucket: z.boolean().optional(),
      secondaryFields: z.array(id).optional(),
      format: format.optional(),
    }),
  }),
  column('date_histogram', {
    ...field,
    params: params({
      interval: id,
      ignoreTimeRange: z.boolean().optional(),
      includeEmptyRows: z.boolean().optional(),
      dropPartials: z.boolean().optional(),
    }),
  }),
  column('range', {
    ...field,
    params: params({
      type: z.enum(['range', 'histogram']),
      maxBars: z.union([z.literal('auto'), z.number()]),
      ranges: z.array(z.record(z.string(), json)),
      format: format.optional(),
    }),
  }),
  column('filters', {
    ...base,
    params: params({
      filters: z.array(
        z
          .object({ input: querySchema, label: z.string().max(4096) })
          .catchall(json)
      ),
    }),
  }),
]);

export const formLayerSchema = z
  .object({
    columnOrder: z.array(id).max(512),
    columns: z.record(id, z.record(z.string(), json)),
    incompleteColumns: z.record(z.string(), json).optional(),
    linkToLayers: z.array(id).optional(),
    sampling: z.number().positive().max(1).optional(),
    ignoreGlobalFilters: z.boolean().optional(),
  })
  .strict();

export const formDatasourceSchema = z
  .object({ layers: z.record(id, formLayerSchema) })
  .strict();

export type FormColumn = z.infer<typeof formColumnSchema>;

/** Every operation the form-based planner reads. */
export const FORM_OPERATIONS: ReadonlySet<string> = new Set(
  formColumnSchema.options.map(({ shape }) => shape.operationType.value)
);
export type FormLayer = z.infer<typeof formLayerSchema>;
