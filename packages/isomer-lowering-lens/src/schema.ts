/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { JsonObject, JsonValue } from './json';

/** A path-bearing reason a stage refused its input. */
export interface LensDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

/** Arguments are copied by `copyJson` first, so anything here is already plain JSON. */
const json = z.custom<JsonValue>(() => true);
const jsonObject = z.record(z.string(), json);
const id = z.string().min(1).max(4096);
const text = z.string().max(4096);
const esql = z
  .string()
  .max(100_000)
  .refine((query) => query.trim().length > 0, 'Expected a nonempty query');

const reference = z.object({ id, name: id, type: id });

export const dataViewSchema = z.object({
  id,
  title: id,
  timeFieldName: id.optional(),
  fieldFormats: z.record(id, jsonObject).optional(),
  fieldLabels: z.record(id, text).optional(),
});

export const savedObjectSchema = z
  .object({
    id,
    type: z.literal('lens'),
    attributes: z
      .object({
        title: text,
        visualizationType: id,
        state: z
          .object({
            datasourceStates: jsonObject,
            visualization: jsonObject,
            query: jsonObject.optional(),
            filters: z.array(jsonObject).max(512).optional(),
          })
          .catchall(json),
      })
      .catchall(json),
    references: z.array(reference).max(512),
  })
  .catchall(json);

export const columnSchema = z
  .object({
    columnId: id,
    fieldName: id,
    label: text.optional(),
    customLabel: z.boolean().optional(),
    inMetricDimension: z.boolean().optional(),
    meta: jsonObject.optional(),
    params: jsonObject.optional(),
  })
  .catchall(json);

export const LAYER_KEYS = [
  'query',
  'columns',
  'timeField',
  'index',
  'ignoreGlobalFilters',
] as const;

export const esqlLayerSchema = z
  .object({
    query: z.object({ esql }).strict().optional(),
    columns: z.array(columnSchema).min(1).max(512),
    timeField: id.optional(),
    index: id.optional(),
    ignoreGlobalFilters: z.boolean().optional(),
  })
  .catchall(json);

export const esqlDatasourceSchema = z
  .object({ layers: z.record(id, esqlLayerSchema) })
  .catchall(json);

/** One layer's executable contract; `readResponse` re-validates it, so a stored plan can be read back. */
export const layerPlanSchema = z
  .object({
    kind: z.literal('esql'),
    layerId: id,
    query: z.object({ language: z.literal('esql'), esql }).strict(),
    columns: z
      .array(columnSchema)
      .min(1)
      .max(512)
      .refine(
        (columns) =>
          new Set(columns.map(({ columnId }) => columnId)).size ===
          columns.length,
        'Lens column IDs must be unique'
      ),
    host: z
      .object({
        timeField: id.nullable(),
        params: z.array(id),
        applyFilters: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const esqlResponseSchema = z
  .object({
    columns: z
      .array(z.object({ name: id, type: id }))
      .min(1)
      .max(512),
    values: z.array(z.array(json)),
    is_partial: z.boolean().optional(),
    is_running: z.boolean().optional(),
  })
  .catchall(json);

export type LensSavedObject = z.infer<typeof savedObjectSchema>;
export type DataViewMetadata = z.infer<typeof dataViewSchema>;
export type LensColumn = z.infer<typeof columnSchema>;
/** An ES|QL layer's plan. */
export type LensLayerPlan = z.infer<typeof layerPlanSchema>;

export const HOST_NEEDS = [
  'dataView',
  'timeRange',
  'now',
  'barTarget',
] as const;

/** Context a host must supply to run a form-based layer. */
export type HostNeed = (typeof HOST_NEEDS)[number];

export const formLayerPlanSchema = z
  .object({
    kind: z.literal('form'),
    layerId: id,
    dataView: id,
    columns: z
      .array(z.object({ columnId: id, operationType: id }).catchall(json))
      .max(512),
    host: z
      .object({
        timeField: id.nullable(),
        applyFilters: z.boolean(),
        sampling: z.number().positive().max(1),
        needs: z.array(z.enum(HOST_NEEDS)),
      })
      .strict(),
  })
  .strict();

/** A form-based layer's plan: its validated Lens columns, in Lens order, and what the host supplies. */
export type FormLayerPlan = z.infer<typeof formLayerPlanSchema>;

export const anyLayerPlanSchema = z.discriminatedUnion('kind', [
  layerPlanSchema,
  formLayerPlanSchema,
]);
export type EsqlResponse = z.infer<typeof esqlResponseSchema>;

export interface LensPlan {
  readonly version: 1;
  readonly source: LensSavedObject;
  readonly dataViews: readonly {
    readonly reference: LensSavedObject['references'][number];
    readonly metadata?: DataViewMetadata;
  }[];
  /** The saved KQL or Lucene query of a form-based plan, verbatim; `null` for ES|QL. */
  readonly query: JsonObject | null;
  /** Saved filters, verbatim, for the layers whose `host.applyFilters` is true. */
  readonly filters: readonly JsonObject[];
  readonly layers: readonly (LensLayerPlan | FormLayerPlan)[];
}

export type LensPlanResult =
  | { readonly status: 'planned'; readonly plan: LensPlan }
  | {
      readonly status: 'invalid' | 'unsupported';
      readonly diagnostics: readonly LensDiagnostic[];
    };

export interface LensTable {
  readonly layerId: string;
  readonly columns: readonly {
    readonly lens: LensColumn;
    readonly type: string;
  }[];
  readonly rows: readonly (readonly JsonValue[])[];
}

export type LensResponseResult =
  | { readonly status: 'ready'; readonly table: LensTable }
  | {
      readonly status: 'invalid';
      readonly diagnostics: readonly LensDiagnostic[];
    };

/** Zod issues as diagnostics under `prefix`. */
export const issueDiagnostics = (
  code: string,
  { issues }: z.ZodError,
  prefix: readonly (string | number)[] = []
): LensDiagnostic[] =>
  issues.map(({ message, path }) => ({
    code,
    message,
    path: [
      ...prefix,
      ...path.map((key) => (typeof key === 'symbol' ? String(key) : key)),
    ],
  }));
