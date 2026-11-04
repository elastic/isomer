/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { JsonObject, JsonValue } from './json';
import { copyPlain } from './json';

/** A path-bearing reason a stage refused its input. */
export interface LensDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly path: readonly (string | number)[];
}

/** Any JSON value; non-finite numbers, `undefined` and other non-JSON leaves fail here. */
export const json: z.ZodType<JsonValue> = z.json();
const jsonObject = z.record(z.string(), json);

/** The longest identifier, reference or parameter name accepted. */
export const MAX_ID_LENGTH = 4096;

/** A nonempty identifier of at most {@link MAX_ID_LENGTH} characters. */
export const id = z.string().min(1).max(MAX_ID_LENGTH);
const text = z.string().max(4096);
const esql = z
  .string()
  .max(100_000)
  .refine((query) => query.trim().length > 0, 'Expected a nonempty query');

/** A custom zod issue carrying its own diagnostic code, which {@link issueDiagnostics} keeps. */
export const addCoded = (
  context: z.RefinementCtx,
  code: string,
  message: string,
  path: (string | number)[]
) => context.addIssue({ code: 'custom', message, path, params: { code } });

/** Indexes of entries whose `key` an earlier entry already has. */
export const repeats = <T>(
  entries: readonly T[],
  key: (entry: T) => string
) => {
  const seen = new Set<string>();
  return entries.flatMap((entry, index) => {
    const value = key(entry);
    const repeated = seen.has(value);
    seen.add(value);
    return repeated ? [{ index, value }] : [];
  });
};

const reference = z.object({ id, name: id, type: id });

/** Host-supplied metadata for a data view the saved object references. */
export const dataViewSchema = z.object({
  id,
  title: id,
  timeFieldName: id.optional(),
  fieldFormats: z.record(id, jsonObject).optional(),
  fieldLabels: z.record(id, text).optional(),
});

/** A Lens saved object: the fields planning reads are checked, the rest is kept verbatim. */
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
            datasourceStates: z.record(z.string(), json),
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

/** What `plan` accepts; reference names and data view IDs must be unique, and each data view referenced. */
export const planInputSchema = z
  .object({
    savedObject: savedObjectSchema,
    dataViews: z.array(dataViewSchema).max(512).default([]),
  })
  .strict()
  .superRefine(({ savedObject: { references }, dataViews }, context) => {
    for (const { index, value } of repeats(references, ({ name }) => name)) {
      addCoded(
        context,
        'lens.duplicate-reference',
        `More than one reference is named "${value}".`,
        ['savedObject', 'references', index]
      );
    }
    const referenced = new Set(
      references
        .filter(({ type }) => type === 'index-pattern')
        .map(({ id: referenceId }) => referenceId)
    );
    const described = new Set<string>();
    dataViews.forEach(({ id: dataViewId }, index) => {
      if (!referenced.has(dataViewId)) {
        addCoded(
          context,
          'lens.unreferenced-data-view',
          `Data view "${dataViewId}" is not referenced by the saved object.`,
          ['dataViews', index]
        );
      } else if (described.has(dataViewId)) {
        addCoded(
          context,
          'lens.duplicate-data-view',
          `Data view "${dataViewId}" is described more than once.`,
          ['dataViews', index]
        );
      }
      described.add(dataViewId);
    });
  });

/** One Lens column of an ES|QL layer, as Lens saves it. */
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

const columnsSchema = z
  .array(columnSchema)
  .min(1)
  .max(512)
  .superRefine((columns, context) => {
    for (const { index, value } of repeats(
      columns,
      ({ columnId }) => columnId
    )) {
      addCoded(
        context,
        'lens.duplicate-column',
        `Column "${value}" appears more than once.`,
        [index]
      );
    }
  });

/** One saved ES|QL layer. `table` is inline data Lens draws instead of running the query; `errors` are editor errors Lens shows instead of drawing. */
export const esqlLayerSchema = z
  .object({
    query: z.object({ esql }).strict().optional(),
    columns: columnsSchema,
    timeField: id.optional(),
    index: id.optional(),
    ignoreGlobalFilters: z.boolean().optional(),
    table: json.optional(),
    errors: z.array(json).optional(),
  })
  .catchall(json);

/** The keys {@link esqlLayerSchema} knows; any other is layer state planning does not understand. */
export const LAYER_KEYS: readonly string[] = esqlLayerSchema.keyof().options;

/** The saved `textBased` datasource. `indexPatternRefs` is Lens's runtime state, which Kibana sometimes persists and planning ignores. */
export const esqlDatasourceSchema = z
  .object({
    layers: z.record(id, esqlLayerSchema),
    indexPatternRefs: json.optional(),
  })
  .catchall(json);

/** One layer's executable contract; `readResponse` re-validates it, so a stored plan can be read back. */
export const layerPlanSchema = z
  .object({
    kind: z.literal('esql'),
    layerId: id,
    query: z.object({ language: z.literal('esql'), esql }).strict(),
    columns: columnsSchema,
    host: z
      .object({
        timeField: id.nullable(),
        params: z.array(id),
        applyFilters: z.boolean(),
      })
      .strict(),
  })
  .strict();

/** A complete ES|QL response as Elasticsearch returns it; column names are unique and every row is as wide as `columns`. */
export const esqlResponseSchema = z
  .object({
    columns: z
      .array(z.object({ name: id, type: id }).catchall(json))
      .min(1)
      .max(512),
    values: z.array(z.array(json)),
    is_partial: z.boolean().optional(),
    is_running: z.boolean().optional(),
  })
  .catchall(json)
  .superRefine(({ columns, values }, context) => {
    for (const { index, value } of repeats(columns, ({ name }) => name)) {
      addCoded(
        context,
        'lens.response.duplicate-column',
        `More than one response column is named "${value}".`,
        ['columns', index]
      );
    }
    values.forEach((row, index) => {
      if (row.length !== columns.length) {
        addCoded(
          context,
          'lens.response.row-width',
          `Row ${index} has ${row.length} cells for ${columns.length} columns.`,
          ['values', index]
        );
      }
    });
  });

/** A Lens saved object `plan` accepted; unknown fields are kept as saved. */
export type LensSavedObject = z.infer<typeof savedObjectSchema>;
/** Host-supplied metadata for one referenced data view. */
export type DataViewMetadata = z.infer<typeof dataViewSchema>;
/** One saved ES|QL layer, as validated. */
export type EsqlLayer = z.infer<typeof esqlLayerSchema>;
/** One Lens column, as saved; `fieldName` names the ES|QL response column it reads. */
export type LensColumn = z.infer<typeof columnSchema>;
/** One planned ES|QL layer: the query to run unchanged, its Lens columns, and what the host must supply. */
export type LensLayerPlan = z.infer<typeof layerPlanSchema>;

/** Each kind of context a form-based layer can need from its host. */
export const HOST_NEEDS = [
  'dataView',
  'timeRange',
  'now',
  'barTarget',
] as const;

/** Context a host must supply to run a form-based layer. */
export type HostNeed = (typeof HOST_NEEDS)[number];

/** One planned form-based layer; `readTable` re-validates it, so a stored plan can be read back. */
export const formLayerPlanSchema = z
  .object({
    kind: z.literal('form'),
    layerId: id,
    dataView: id,
    /** Layers Lens's editor ties this one to, such as a metric trendline's main layer. */
    linkedTo: z.array(id),
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

/** Any planned layer, told apart by `kind`. */
export const anyLayerPlanSchema = z.discriminatedUnion('kind', [
  layerPlanSchema,
  formLayerPlanSchema,
]);
/** A complete ES|QL response, `{ columns, values }`. */
export type EsqlResponse = z.infer<typeof esqlResponseSchema>;

/** What `plan` returns for a saved object it accepts. */
export interface LensPlan {
  readonly version: 1;
  /** The saved object as validated, sharing nothing with the input. */
  readonly source: LensSavedObject;
  /** Each referenced data view, with the host's metadata for it when given. */
  readonly dataViews: readonly {
    readonly reference: LensSavedObject['references'][number];
    readonly metadata?: DataViewMetadata;
  }[];
  /** The saved KQL or Lucene query of a form-based plan, verbatim; ES|QL plans have none. */
  readonly query?: JsonObject;
  /** Saved Kibana filters, verbatim and not Query DSL, for the layers whose `host.applyFilters` is true. */
  readonly filters: readonly JsonObject[];
  readonly layers: readonly (LensLayerPlan | FormLayerPlan)[];
}

/**
 * `invalid` means the input is malformed, or Kibana could not draw it either.
 * `unsupported` means Kibana can draw it but this package does not plan it yet; the code says which feature.
 */
export type LensPlanResult =
  | { readonly status: 'planned'; readonly plan: LensPlan }
  | {
      readonly status: 'invalid' | 'unsupported';
      readonly diagnostics: readonly LensDiagnostic[];
    };

/** A response projected onto one layer's Lens columns, in Lens order. */
export interface LensTable {
  readonly layerId: string;
  /** Each Lens column with the response column's ES|QL type. */
  readonly columns: readonly {
    readonly lens: LensColumn;
    readonly type: string;
  }[];
  /** One cell per column, as the response held it: nulls and multivalue arrays included. */
  readonly rows: readonly (readonly JsonValue[])[];
  /** Whether Elasticsearch marked the response partial, as when a remote cluster was skipped; Kibana draws it with a warning. */
  readonly partial: boolean;
}

/** What `readResponse` returns. */
export type LensResponseResult =
  | { readonly status: 'ready'; readonly table: LensTable }
  | {
      readonly status: 'invalid';
      readonly diagnostics: readonly LensDiagnostic[];
    };

/** Zod issues as diagnostics under `prefix`, each with its own code when a refinement gave one. */
export const issueDiagnostics = (
  code: string,
  { issues }: z.ZodError,
  prefix: readonly (string | number)[] = []
): LensDiagnostic[] =>
  issues.map((issue) => {
    const { message, path } = issue;
    const own: unknown =
      issue.code === 'custom' ? issue.params?.code : undefined;
    return {
      code: typeof own === 'string' ? own : code,
      message,
      path: [
        ...prefix,
        ...path.map((key) => (typeof key === 'symbol' ? String(key) : key)),
      ],
    };
  });

/** A parsed argument, or the diagnostics refusing it. */
export type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: LensDiagnostic[] };

/**
 * Copies `value` with {@link copyPlain} and parses the copy with `schema`, refusing under `path`.
 * `codes.json` names a refused copy and `codes.shape` a schema issue without a code of its own.
 */
export const parseArgument = <T>(
  value: unknown,
  schema: z.ZodType<T>,
  codes: { readonly json: string; readonly shape: string },
  path: readonly (string | number)[] = []
): Parsed<T> => {
  const copied = copyPlain(value);
  if (!copied.ok) {
    return {
      ok: false,
      diagnostics: [{ code: codes.json, message: copied.message, path }],
    };
  }
  const parsed = schema.safeParse(copied.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        diagnostics: issueDiagnostics(codes.shape, parsed.error, path),
      };
};
