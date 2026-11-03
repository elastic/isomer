/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { copyJson, type JsonValue } from './json';
import { own } from './own';
import {
  formLayerPlanSchema,
  issueDiagnostics,
  type LensColumn,
  type LensDiagnostic,
  type LensResponseResult,
} from './schema';

const json = z.custom<JsonValue>(() => true);
const id = z.string().min(1).max(4096);

const datatableSchema = z
  .object({
    type: z.literal('datatable'),
    columns: z
      .array(
        z
          .object({
            id,
            name: z.string().max(4096),
            meta: z
              .object({
                type: id,
                params: z.record(z.string(), json).optional(),
              })
              .catchall(json),
          })
          .catchall(json)
      )
      .max(512),
    rows: z.array(z.record(z.string(), json)),
  })
  .catchall(json);

const invalid = (diagnostics: LensDiagnostic[]): LensResponseResult => ({
  status: 'invalid',
  diagnostics,
});

const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Projects a Lens-resolved Kibana `Datatable` onto a planned form-based layer
 * by column ID, never by position or name. Every column no other column
 * references must be present; formula parts may be.
 */
export const readTable = (
  layer: unknown,
  datatable: unknown
): LensResponseResult => {
  const copiedLayer = copyJson(layer);
  if (!copiedLayer.ok) {
    return invalid([
      {
        code: 'lens.table.invalid-json',
        message: copiedLayer.message,
        path: ['layer'],
      },
    ]);
  }
  const copiedTable = copyJson(datatable);
  if (!copiedTable.ok) {
    return invalid([
      {
        code: 'lens.table.invalid-json',
        message: copiedTable.message,
        path: ['datatable'],
      },
    ]);
  }
  const parsedLayer = formLayerPlanSchema.safeParse(copiedLayer.value);
  if (!parsedLayer.success) {
    return invalid(
      issueDiagnostics('lens.table.invalid-layer', parsedLayer.error, ['layer'])
    );
  }
  const parsed = datatableSchema.safeParse(copiedTable.value);
  if (!parsed.success) {
    return invalid(
      issueDiagnostics('lens.table.invalid-shape', parsed.error, ['datatable'])
    );
  }
  const { layerId, columns: planned } = parsedLayer.data;
  const { columns, rows } = parsed.data;

  const diagnostics: LensDiagnostic[] = [];
  const byId = new Map<string, (typeof columns)[number]>();
  columns.forEach((column, index) => {
    if (byId.has(column.id)) {
      diagnostics.push({
        code: 'lens.table.duplicate-column',
        message: `More than one table column has ID "${column.id}".`,
        path: ['datatable', 'columns', index],
      });
    }
    byId.set(column.id, column);
  });
  const referenced = new Set(
    planned.flatMap(({ references }) =>
      Array.isArray(references)
        ? references.filter((ref) => typeof ref === 'string')
        : []
    )
  );
  for (const { columnId } of planned) {
    if (!referenced.has(columnId) && !byId.has(columnId)) {
      diagnostics.push({
        code: 'lens.table.missing-column',
        message: `The table has no column "${columnId}".`,
        path: ['datatable', 'columns'],
      });
    }
  }
  if (diagnostics.length) {
    return invalid(diagnostics);
  }

  const present = planned.filter(({ columnId }) => byId.has(columnId));
  return {
    status: 'ready',
    table: {
      layerId,
      columns: present.map((column) => {
        const { id: columnId, name, meta } = byId.get(column.columnId)!;
        const format = isRecord(column.params)
          ? column.params.format
          : undefined;
        const lens: LensColumn = {
          columnId,
          fieldName:
            typeof column.sourceField === 'string'
              ? column.sourceField
              : columnId,
          // Lens names a form-based column by its label, custom or not.
          label: name,
          customLabel: true,
          meta: {
            type: meta.type,
            ...(meta.params ? { params: meta.params } : {}),
          },
          ...(isRecord(format) ? { params: { format } } : {}),
        };
        return { lens, type: meta.type };
      }),
      rows: rows.map((row) =>
        present.map(({ columnId }) => own(row, columnId) ?? null)
      ),
    },
  };
};
