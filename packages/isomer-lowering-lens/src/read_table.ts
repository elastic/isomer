/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { isJsonObject, JSON_LIMITS } from './json';
import { own } from './own';
import {
  addCoded,
  formLayerPlanSchema,
  id,
  json,
  type LensColumn,
  type LensDiagnostic,
  type LensResponseResult,
  parseArgument,
  repeats,
} from './schema';

/** The Kibana `Datatable` Lens's expression produces; column IDs are unique. */
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
  .catchall(json)
  .superRefine(({ columns }, context) => {
    for (const { index, value } of repeats(columns, (column) => column.id)) {
      addCoded(
        context,
        'lens.table.duplicate-column',
        `More than one table column has ID "${value}".`,
        ['columns', index]
      );
    }
  });

const invalid = (diagnostics: LensDiagnostic[]): LensResponseResult => ({
  status: 'invalid',
  diagnostics,
});

/**
 * Projects a Lens-resolved Kibana `Datatable` onto a planned form-based layer
 * by column ID, never by position or name. Every column no other column
 * references must be present; formula parts may be.
 */
export const readTable = (
  layer: unknown,
  datatable: unknown
): LensResponseResult => {
  const parsedLayer = parseArgument(
    layer,
    formLayerPlanSchema,
    { json: 'lens.table.invalid-json', shape: 'lens.table.invalid-layer' },
    ['layer']
  );
  if (!parsedLayer.ok) {
    return invalid(parsedLayer.diagnostics);
  }
  const parsed = parseArgument(
    datatable,
    datatableSchema,
    { json: 'lens.table.invalid-json', shape: 'lens.table.invalid-shape' },
    ['datatable']
  );
  if (!parsed.ok) {
    return invalid(parsed.diagnostics);
  }
  const { layerId, columns: planned } = parsedLayer.value;
  const { columns, rows } = parsed.value;

  const byId = new Map(columns.map((column) => [column.id, column]));
  const referenced = new Set(
    planned.flatMap(({ references }) =>
      Array.isArray(references)
        ? references.filter((ref) => typeof ref === 'string')
        : []
    )
  );
  const diagnostics: LensDiagnostic[] = planned
    .filter(({ columnId }) => !referenced.has(columnId) && !byId.has(columnId))
    .map(({ columnId }) => ({
      code: 'lens.table.missing-column',
      message: `The table has no column "${columnId}".`,
      path: ['datatable', 'columns'],
    }));
  const present = planned.filter(({ columnId }) => byId.has(columnId));
  // Sparse rows expand to one cell per planned column, so bound the projection, not the input.
  if (rows.length * present.length > JSON_LIMITS.values) {
    diagnostics.push({
      code: 'lens.table.too-large',
      message: `The table would hold more than ${JSON_LIMITS.values} cells.`,
      path: ['datatable', 'rows'],
    });
  }
  if (diagnostics.length) {
    return invalid(diagnostics);
  }

  return {
    status: 'ready',
    table: {
      layerId,
      columns: present.map((column) => {
        const { id: columnId, name, meta } = byId.get(column.columnId)!;
        const format = isJsonObject(column.params)
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
          ...(isJsonObject(format) ? { params: { format } } : {}),
        };
        return { lens, type: meta.type };
      }),
      rows: rows.map((row) =>
        present.map(({ columnId }) => own(row, columnId) ?? null)
      ),
      partial: false,
    },
  };
};
